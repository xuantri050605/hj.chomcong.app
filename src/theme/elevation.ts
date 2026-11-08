import { Platform, ViewStyle } from 'react-native';
import { colors } from './colors';

export const elevations = {
  // Level 0: Flat card with subtle border
  flat: {
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.surface.card,
  } as ViewStyle,

  // Level 1: Standard card with soft ambient shadow
  card: {
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    backgroundColor: colors.surface.card,
    ...Platform.select({
      ios: {
        shadowColor: colors.slate900,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      web: {
        boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05), 0 1px 4px -1px rgba(15, 23, 42, 0.03)',
      } as any,
    }),
  } as ViewStyle,

  // Level 2: Floating card (hover or elevated interactive item)
  floating: {
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
    backgroundColor: colors.surface.card,
    ...Platform.select({
      ios: {
        shadowColor: colors.slate900,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
      web: {
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
      } as any,
    }),
  } as ViewStyle,

  // Level 3: Modal dialog or bottom sheet
  modal: {
    ...Platform.select({
      ios: {
        shadowColor: colors.slate900,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.16,
        shadowRadius: 32,
      },
      android: { elevation: 12 },
      web: {
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
      } as any,
    }),
  } as ViewStyle,

  // Glow effect for buttons or status dots
  glow: (glowColor: string): ViewStyle => ({
    ...Platform.select({
      ios: {
        shadowColor: glowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
      web: {
        boxShadow: `0 4px 14px 0 ${glowColor}40`,
      } as any,
    }),
  }),
};

export type Elevations = typeof elevations;
