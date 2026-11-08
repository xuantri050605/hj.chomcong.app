import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { theme } from '../theme/theme';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat' | 'glass';
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
    borderRadius: theme.radius.xl,
    padding: 16,
  },
  default: {
    ...theme.elevations.card,
  },
  elevated: {
    ...theme.elevations.floating,
  },
  outlined: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
  },
  flat: {
    ...theme.elevations.flat,
  },
  glass: {
    backgroundColor: theme.colors.surface.glass,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } as any,
      default: {},
    }),
    ...theme.elevations.card,
  },
});
