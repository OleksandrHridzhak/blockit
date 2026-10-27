import { remainingSeconds, screenTime } from '../../features/screen-time/client';
jest.mock('expo-modules-core', () => ({ requireOptionalNativeModule: () => null }));

describe('Screen Time pause clock and unsupported runtime', () => {
  it('reconstructs remaining time after the app was suspended', () => {
    const readyAt = 20_000;
    expect(remainingSeconds(readyAt, 0)).toBe(20);
    expect(remainingSeconds(readyAt, 19_999)).toBe(1);
    expect(remainingSeconds(readyAt, 28_000)).toBe(0);
  });
  it('never reports real protection in web or an old native build', async () => {
    expect(await screenTime.status()).toMatchObject({ available: false, enabled: false, count: 0 });
    expect(await screenTime.pending()).toBeNull();
    expect(() => screenTime.finish('fake', '')).toThrow();
  });
});
