import * as Linking from 'expo-linking';
import { openGuardedTargetApp } from '../../features/intervention/open-target-app';
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-linking', () => ({ canOpenURL: jest.fn(), openURL: jest.fn() }));

beforeEach(() => jest.resetAllMocks());
it('opens an installed target using its documented link', async () => {
  jest.mocked(Linking.canOpenURL).mockResolvedValue(true);
  await expect(openGuardedTargetApp('instagram')).resolves.toBe(true);
  expect(Linking.openURL).toHaveBeenCalledWith('instagram://');
});
it('keeps the user in Blockit if the target cannot be opened instead of taking them to the store', async () => {
  jest.mocked(Linking.canOpenURL).mockResolvedValue(false);
  await expect(openGuardedTargetApp('instagram')).resolves.toBe(false);
  expect(Linking.openURL).not.toHaveBeenCalled();
});
