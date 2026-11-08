import { colors } from './colors';
import { typography } from './typography';
import { elevations } from './elevation';
import { spacing, radius } from './spacing';
import { BREAKPOINTS, MAX_CONTENT_WIDTH, isDesktopWidth, useResponsive } from './responsive';

export const theme = {
  colors,
  radius,
  spacing,
  typography,
  elevations,
  shadows: {
    card: elevations.card,
    float: elevations.floating,
    glow: elevations.glow,
  },
  responsive: {
    breakpoints: BREAKPOINTS,
    maxContentWidth: MAX_CONTENT_WIDTH,
    isDesktopWidth,
  },
};

export { colors, typography, elevations, spacing, radius, BREAKPOINTS, MAX_CONTENT_WIDTH, isDesktopWidth, useResponsive };

export type AppTheme = typeof theme;
