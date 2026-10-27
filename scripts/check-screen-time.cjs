// Structural integration check using the real Expo iOS template; runs on Windows.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const xcode = require('xcode');
const plist = require('@expo/plist').default;
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'blockit-screen-time-'));
execFileSync('tar', ['-xzf', path.join(path.dirname(require.resolve('expo/package.json')), 'template.tgz'), '-C', output, 'package/ios/HelloWorld.xcodeproj/project.pbxproj']);
const project = xcode.project(path.join(output, 'package/ios/HelloWorld.xcodeproj/project.pbxproj'));
project.parseSync();
const appConfig = require('../app.json').expo;
const config = require('../plugins/withScreenTime')(structuredClone(appConfig));
const extensionCredentials = config.extra.eas.build.experimental.ios.appExtensions;
assert.equal(extensionCredentials.length, 3);
for (const extension of extensionCredentials) {
  assert.equal(extension.bundleIdentifier, `${appConfig.ios.bundleIdentifier}.${extension.targetName}`);
  assert.equal(extension.entitlements['com.apple.developer.family-controls'], true);
  assert.deepEqual(extension.entitlements['com.apple.security.application-groups'], ['group.com.hridzhak.blockit.2WT689Y795']);
}
const modRequest = { projectRoot: root, platformProjectRoot: output, projectName: 'HelloWorld', platform: 'ios' };
function targets() { return Object.entries(project.pbxNativeTargetSection()).filter(([key]) => !key.endsWith('_comment')); }
(async () => {
  const input = { ...config, modRequest, modResults: project };
  await config.mods.ios.xcodeproj(input);
  await config.mods.ios.xcodeproj(input);
  assert.equal(targets().length, 4, 'One host and exactly three extensions after two runs');
  const ent = await config.mods.ios.entitlements({ ...config, modRequest, modResults: {} });
  assert.equal(ent.modResults['com.apple.developer.family-controls'], true);
  assert.deepEqual(ent.modResults['com.apple.security.application-groups'], ['group.com.hridzhak.blockit.2WT689Y795']);
  for (const [id, target] of targets().slice(1)) {
    const name = target.name.replaceAll('"', '');
    const info = plist.parse(fs.readFileSync(path.join(output, name, 'Info.plist'), 'utf8'));
    assert(info.NSExtension.NSExtensionPointIdentifier);
    const configurations = project.pbxXCConfigurationList()[target.buildConfigurationList].buildConfigurations;
    for (const entry of configurations) {
      const settings = project.pbxXCBuildConfigurationSection()[entry.value].buildSettings;
      assert.equal(settings.CODE_SIGN_ENTITLEMENTS, `${name}/${name}.entitlements`);
      assert(settings.PRODUCT_BUNDLE_IDENTIFIER.includes(name));
    }
    const phaseId = target.buildPhases.find(p => p.comment === 'Sources').value;
    const sources = project.hash.project.objects.PBXSourcesBuildPhase[phaseId].files;
    assert.equal(sources.length, 4, `${name} needs its entry point, shared store, access window and history reducer`);
    for (const source of sources) {
      const build = project.pbxBuildFileSection()[source.value];
      const file = project.pbxFileReferenceSection()[build.fileRef];
      assert.equal(file.sourceTree, 'SOURCE_ROOT');
      assert(fs.existsSync(path.join(output, file.path.replaceAll('"', ''))));
    }
    const host = project.getFirstTarget().firstTarget;
    assert(host.dependencies.some(dep => project.hash.project.objects.PBXTargetDependency[dep.value].target === id));
  }
  const copyPhases = Object.entries(project.hash.project.objects.PBXCopyFilesBuildPhase).filter(([key]) => !key.endsWith('_comment'));
  const embedded = copyPhases.flatMap(([, value]) => value.files || []).filter(file => file.comment.includes('.appex'));
  assert.equal(embedded.length, 3, 'All extensions embedded exactly once');
  // Verify serialized project remains parseable.
  const saved = path.join(output, 'verified.pbxproj');
  fs.writeFileSync(saved, project.writeSync());
  xcode.project(saved).parseSync();
  console.log('PASS: three embedded extension targets, source paths, dependencies, capabilities, idempotence, project serialization.');
  console.log(`Generated inspection files: ${output}`);
})().catch(error => { console.error(error); process.exitCode = 1; });


