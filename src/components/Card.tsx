import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { theme } from '../theme/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
}

export default function Card({ children, style, variant = 'default' }: CardProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  default: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  elevated: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.float,
  },
  outlined: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
  },
  flat: {
    backgroundColor: theme.colors.slate100,
    borderWidth: 0,
  },
});
