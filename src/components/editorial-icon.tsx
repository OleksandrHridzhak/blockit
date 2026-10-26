import { Image } from 'expo-image';

const icons = {
  shield: { light: require('@/assets/icons/shield-check-light.svg'), fill: require('@/assets/icons/shield-check-fill.svg') },
  info: { light: require('@/assets/icons/info-light.svg'), fill: require('@/assets/icons/info-fill.svg') },
  pause: { light: require('@/assets/icons/pause-light.svg'), fill: require('@/assets/icons/pause-light.svg') },
};
export function EditorialIcon({ name, active = false, size = 24 }: {
  name: keyof typeof icons; active?: boolean; size?: number;
}) {
  return <Image source={icons[name][active ? 'fill' : 'light']} tintColor={active ? '#FAFAFA' : '#8E8E8E'}
    style={{ width: size, height: size }} contentFit="contain" accessible={false} />;
}
