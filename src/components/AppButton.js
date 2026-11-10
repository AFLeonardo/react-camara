import { Pressable, Text } from 'react-native';
import { common } from '../lib/theme';

export default function AppButton({ title, onPress, disabled, variant = 'primary', style }) {
  const secondary = variant === 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        common.button,
        secondary && common.buttonSecondary,
        disabled && common.buttonDisabled,
        pressed && !disabled && { opacity: 0.8 },
        style,
      ]}
    >
      <Text style={[common.buttonText, secondary && common.buttonTextSecondary]}>{title}</Text>
    </Pressable>
  );
}
