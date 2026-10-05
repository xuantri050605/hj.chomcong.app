export const theme = {
  colors: {
    // Primary - Royal Blue
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    primaryLight: '#3B82F6',
    primarySoft: '#EFF6FF',
    primaryBorder: '#BFDBFE',

    // Success - Emerald Green
    success: '#10B981',
    successDark: '#059669',
    successLight: '#34D399',
    successSoft: '#ECFDF5',
    successBorder: '#A7F3D0',

    // Warning - Amber / Gold
    warning: '#F59E0B',
    warningDark: '#D97706',
    warningLight: '#FBBF24',
    warningSoft: '#FFFBEB',
    warningBorder: '#FDE68A',

    // Danger - Rose / Red
    danger: '#EF4444',
    dangerDark: '#DC2626',
    dangerLight: '#F87171',
    dangerSoft: '#FEF2F2',
    dangerBorder: '#FECACA',

    // Accent - Violet / Purple
    purple: '#8B5CF6',
    purpleDark: '#7C3AED',
    purpleLight: '#A78BFA',
    purpleSoft: '#F5F3FF',
    purpleBorder: '#DDD6FE',

    // Cyan / Teal
    cyan: '#06B6D4',
    cyanSoft: '#ECFEFF',

    // Slate / Neutral Scale
    slate900: '#0F172A',
    slate800: '#1E293B',
    slate700: '#334155',
    slate600: '#475569',
    slate500: '#64748B',
    slate400: '#94A3B8',
    slate300: '#CBD5E1',
    slate200: '#E2E8F0',
    slate100: '#F1F5F9',
    slate50: '#F8FAFC',
    white: '#FFFFFF',

    // Backgrounds
    background: '#F8FAFC',
    cardBackground: '#FFFFFF',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
  },

  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  shadows: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    float: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 6,
    },
    glow: (color: string) => ({
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    }),
  },
};

export type AppTheme = typeof theme;
