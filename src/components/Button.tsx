import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, StyleProp, View } from 'react-native';
import { theme } from '../theme/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
        <Text
          style={[
            styles.baseText,
            styles[`${variant}Text` as keyof typeof styles],
            styles[`${size}Text` as keyof typeof styles],
            disabled && styles.disabledText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 6,
  },
  baseText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Sizes
  sm: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
  },
  lg: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: theme.radius.lg,
  },
  smText: {
    fontSize: 12,
  },
  mdText: {
    fontSize: 14,
  },
  lgText: {
    fontSize: 16,
  },

  // Variants
  primary: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.glow(theme.colors.primary),
  },
  primaryText: {
    color: theme.colors.white,
  },

  secondary: {
    backgroundColor: theme.colors.slate100,
    borderWidth: 1,
    borderColor: theme.colors.slate200,
  },
  secondaryText: {
    color: theme.colors.slate700,
  },

  success: {
    backgroundColor: theme.colors.success,
    ...theme.shadows.glow(theme.colors.success),
  },
  successText: {
    color: theme.colors.white,
  },

  danger: {
    backgroundColor: theme.colors.danger,
    ...theme.shadows.glow(theme.colors.danger),
  },
  dangerText: {
    color: theme.colors.white,
  },

  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  outlineText: {
    color: theme.colors.primary,
  },

  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: theme.colors.primary,
  },

  // Disabled
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: theme.colors.slate400,
  },
});
