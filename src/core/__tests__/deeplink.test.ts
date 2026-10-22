import { normalizeAppId, parseInterveneLink } from '../deeplink';

describe('parseInterveneLink', () => {
  it('parses a canonical link', () => {
    expect(parseInterveneLink('blockit://intervene?app=instagram')).toEqual({
      kind: 'intervene',
      appId: 'instagram',
    });
  });

  it('accepts triple-slash form and normalizes case', () => {
    expect(parseInterveneLink('blockit:///intervene?app=TikTok')).toEqual({
      kind: 'intervene',
      appId: 'tiktok',
    });
  });

  it.each([
    'https://intervene?app=instagram',
    'blockit://settings?app=instagram',
    'blockit://intervene',
    'blockit://intervene?app=',
    'blockit://intervene?app=../../etc',
    'not a url',
  ])('rejects %s', (url) => {
    expect(parseInterveneLink(url)).toBeNull();
  });
});

describe('normalizeAppId', () => {
  it('trims and lowercases', () => {
    expect(normalizeAppId('  YouTube ')).toBe('youtube');
  });
  it('rejects empty', () => {
    expect(normalizeAppId(undefined)).toBeNull();
  });
});
