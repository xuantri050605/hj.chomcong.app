/**
 * HOJEONG Corporate Design System — Color Tokens
 * Primary corporate visual identity: Red + White
 * Restrained corporate elegance: Clean white interface with subtle gray surfaces and restrained red accents.
 */

export const colors = {
  // Brand Primary - Corporate HOJEONG Red
  brand: {
    50: '#FFF1F2',  // Soft Red
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#EF4444', // Accent Red
    600: '#D71920', // Primary Corporate Red
    700: '#A80F17', // Dark Red
    800: '#881337',
    900: '#4C0519',
    gradient: ['#D71920', '#A80F17'] as const,
  },

  // Primary brand palette
  primary: '#D71920',       // Primary Red
  primaryDark: '#A80F17',   // Dark Red
  primaryLight: '#EF4444',  // Accent Red
  primarySoft: '#FFF1F2',   // Soft Red
  primaryBorder: '#FECDD3', // Border Red Soft

  // Semantic Status: Success (Green)
  success: '#16A34A',
  successDark: '#15803D',
  successLight: '#22C55E',
  successSoft: '#F0FDF4',
  successBorder: '#BBF7D0',

  // Semantic Status: Warning (Amber / Gold)
  warning: '#F59E0B',
  warningDark: '#D97706',
  warningLight: '#FBBF24',
  warningSoft: '#FFFBEB',
  warningBorder: '#FDE68A',

  // Semantic Status: Danger / Critical
  danger: '#DC2626',
  dangerDark: '#991B1B',
  dangerLight: '#EF4444',
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FECACA',

  // Semantic Status: Info (Corporate Blue)
  info: '#2563EB',
  infoDark: '#1D4ED8',
  infoSoft: '#EFF6FF',
  infoBorder: '#BFDBFE',

  // Semantic Accents
  purple: '#7C3AED',
  purpleDark: '#6D28D9',
  purpleLight: '#8B5CF6',
  purpleSoft: '#F5F3FF',
  purpleBorder: '#DDD6FE',

  cyan: '#0891B2',
  cyanDark: '#0E7490',
  cyanSoft: '#ECFEFF',
  cyanBorder: '#A5F3FC',

  teal: '#0D9488',
  tealSoft: '#F0FDFA',

  orange: '#EA580C',
  orangeSoft: '#FFF7ED',

  // Corporate Neutral Scale
  slate900: '#171717', // Primary Text
  slate800: '#262626',
  slate700: '#404040',
  slate600: '#525252',
  slate500: '#64748B', // Secondary Text
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E5E7EB', // Border
  slate100: '#F1F5F9',
  slate50: '#F7F8FA',  // Main Background
  white: '#FFFFFF',    // Surface

  // Surfaces & Borders
  background: '#F7F8FA',     // Main Background
  cardBackground: '#FFFFFF', // Surface
  border: '#E5E7EB',         // Border
  borderLight: '#F1F5F9',

  surface: {
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    cardSubtle: '#F7F8FA',
    glass: 'rgba(255, 255, 255, 0.96)',
    glassDark: 'rgba(23, 23, 23, 0.65)',
    backdrop: 'rgba(23, 23, 23, 0.45)',
  },
};

export type Colors = typeof colors;
