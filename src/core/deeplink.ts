/**
 * Parsing of the `blockit://intervene?app=<id>` deep link that the iOS Shortcuts
 * automation opens when a guarded app is launched.
 *
 * Pure TS, no React Native imports — unit-tested on any OS.
 */

export type InterveneLink = {
  kind: 'intervene';
  appId: string;
};

const APP_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export function normalizeAppId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const id = raw.trim().toLowerCase();
  return APP_ID_RE.test(id) ? id : null;
}

export function parseInterveneLink(url: string): InterveneLink | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'blockit:') return null;

  // `blockit://intervene?app=x` → host = "intervene"; `blockit:///intervene` → pathname
  const route = (parsed.host || parsed.pathname.replace(/^\/+/, '')).toLowerCase();
  if (route !== 'intervene') return null;

  const appId = normalizeAppId(parsed.searchParams.get('app'));
  if (!appId) return null;

  return { kind: 'intervene', appId };
}
