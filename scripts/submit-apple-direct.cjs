// Use Apple's documented Build Uploads API from the authenticated release
// computer. Private keys and signed storage URLs are never written to disk.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const APP = '6827022647';
const VERSION = '0.2.0';
const number = process.argv[2];
if (!/^[1-9][0-9]*$/.test(number ?? '')) throw new Error('A build number is required');
const ipaPath = path.resolve(`outputs/github-ipa-${number}/Blockit.ipa`);
const statePath = path.resolve(`outputs/apple-submit-${number}.json`);
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
function save(update) { Object.assign(state, update); fs.writeFileSync(statePath, JSON.stringify(state, null, 2)); }
function failure(message) { const error = new Error(message); error.safeMessage = message; return error; }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const eas = process.env.BLOCKIT_EAS_CLI_DIR;
  if (!eas) throw failure('BLOCKIT_EAS_CLI_DIR must point to the installed EAS CLI');
  const Session = require(path.join(eas, 'build/user/SessionManager')).default;
  const session = new Session({ setActor() {} });
  const client = session.getGraphqlClient({ accessToken: session.getAccessToken(), sessionSecret: session.getSessionSecret() });
  const actor = await session.getUserAsync();
  const config = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
  const account = actor.accounts.find(value => value.name === config.owner);
  const helper = require(path.join(eas, 'build/credentials/ios/actions/AscApiKeyUtils'));
  const resolved = await helper.resolveAscApiKeyForAppCredentialsAsync({ graphqlClient: client,
    app: { account, projectName: config.slug, bundleIdentifier: config.ios.bundleIdentifier } });
  if (!resolved) throw failure('No existing App Store Connect key is configured');
  const key = resolved.ascApiKey;
  function jwt() {
    const iat = Math.floor(Date.now() / 1000);
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = encode({ alg: 'ES256', kid: key.keyId, typ: 'JWT' }) + '.'
      + encode({ iss: key.issuerId, iat, exp: iat + 600, aud: 'appstoreconnect-v1' });
    return unsigned + '.' + crypto.sign('sha256', Buffer.from(unsigned), { key: key.keyP8, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  }
  async function api(endpoint, method = 'GET', body) {
    const response = await fetch('https://api.appstoreconnect.apple.com' + endpoint, {
      method, headers: { Authorization: 'Bearer ' + jwt(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const value = await response.json().catch(() => ({}));
      const details = (value.errors ?? []).map(error => `${error.code}: ${error.detail ?? error.title}`).join('; ');
      throw failure(`Apple API ${method} ${endpoint.split('?')[0]} returned ${response.status}: ${details}`);
    }
    return response.status === 204 ? null : response.json();
  }

  await api('/v1/apps/' + APP);
  if (!state.uploadId) {
    const previous = await api(`/v1/apps/${APP}/buildUploads?filter[cfBundleVersion]=${number}&filter[cfBundleShortVersionString]=${VERSION}&limit=10`);
    const reusable = previous.data.find(value => value.attributes.state.state !== 'FAILED');
    if (reusable) save({ uploadId: reusable.id });
    else {
      const created = await api('/v1/buildUploads', 'POST', { data: { type: 'buildUploads',
        attributes: { cfBundleShortVersionString: VERSION, cfBundleVersion: number, platform: 'IOS' },
        relationships: { app: { data: { type: 'apps', id: APP } } } } });
      save({ uploadId: created.data.id });
    }
    console.log('Apple build upload reserved:', state.uploadId);
  }
  let upload = (await api('/v1/buildUploads/' + state.uploadId + '?include=build,assetFile')).data;
  if (upload.attributes.state.state === 'AWAITING_UPLOAD' && !state.committed) {
    const bytes = fs.readFileSync(ipaPath);
    let file;
    if (state.fileId) file = (await api('/v1/buildUploadFiles/' + state.fileId)).data;
    else {
      file = (await api('/v1/buildUploadFiles', 'POST', { data: { type: 'buildUploadFiles',
        attributes: { assetType: 'ASSET', fileName: 'Blockit.ipa', fileSize: bytes.length, uti: 'com.apple.ipa' },
        relationships: { buildUpload: { data: { type: 'buildUploads', id: state.uploadId } } } } })).data;
      save({ fileId: file.id });
    }
    const operations = file.attributes.uploadOperations ?? [];
    if (!operations.length) throw failure('Apple did not provide an upload operation');
    for (let index = 0; index < operations.length; index++) {
      const operation = operations[index];
      if (new URL(operation.url).protocol !== 'https:') throw failure('Apple supplied a non-HTTPS upload endpoint');
      const headers = Object.fromEntries(operation.requestHeaders.map(header => [header.name, header.value]));
      const response = await fetch(operation.url, { method: operation.method, headers,
        body: bytes.subarray(operation.offset, operation.offset + operation.length) });
      if (!response.ok) throw failure(`Apple storage upload part ${index + 1} failed: HTTP ${response.status}`);
      console.log(`Uploaded part ${index + 1}/${operations.length}`);
    }
    await api('/v1/buildUploadFiles/' + file.id, 'PATCH', { data: { type: 'buildUploadFiles', id: file.id,
      attributes: { uploaded: true, sourceFileChecksums: { file: { algorithm: 'MD5', hash: crypto.createHash('md5').update(bytes).digest('hex') } } } } });
    save({ committed: true });
    console.log('Apple accepted the uploaded IPA; waiting for processing.');
  }
  let lastState;
  for (let attempt = 0; attempt < 80; attempt++) {
    upload = (await api('/v1/buildUploads/' + state.uploadId + '?include=build,assetFile')).data;
    const status = upload.attributes.state.state;
    save({ status, buildId: upload.relationships?.build?.data?.id ?? state.buildId });
    if (status !== lastState) { console.log('Apple processing state:', status); lastState = status; }
    if (status === 'FAILED') throw failure(JSON.stringify(upload.attributes.state.errors ?? []));
    if (status === 'COMPLETE') break;
    await sleep(15000);
  }
  if (state.status !== 'COMPLETE') return;
  if (state.buildId) {
    const build = (await api('/v1/builds/' + state.buildId)).data;
    save({ processingState: build.attributes.processingState });
    console.log('TestFlight build processing:', build.attributes.processingState);
    if (build.attributes.processingState === 'VALID') {
      const groups = (await api(`/v1/apps/${APP}/betaGroups?limit=100`)).data;
      const group = groups.find(value => value.attributes.isInternalGroup && value.attributes.name === 'Blockit Device Testing');
      if (group) {
        await api(`/v1/betaGroups/${group.id}/relationships/builds`, 'POST', { data: [{ type: 'builds', id: state.buildId }] });
        save({ internalGroup: group.attributes.name });
        console.log('Added build to the existing internal group:', group.attributes.name);
      }
    }
  }
}

main().catch(error => { console.error(error.safeMessage ?? 'Direct Apple upload failed; no credentials were printed.'); process.exitCode = 1; });
