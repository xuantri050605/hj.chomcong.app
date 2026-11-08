import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  mobile: 768,
  desktop: 1200,
};

export const MAX_CONTENT_WIDTH = 1200;

export function isDesktopWidth(width: number): boolean {
  return width >= BREAKPOINTS.mobile;
}

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINTS.mobile;
  const isLargeDesktop = width >= BREAKPOINTS.desktop;

  return {
    width,
    height,
    isDesktop,
    isLargeDesktop,
    isMobile: !isDesktop,
    contentMaxWidth: Math.min(MAX_CONTENT_WIDTH, width),
    // Helper to calculate column width with gaps
    kpiColumns: isDesktop ? 4 : 2,
    kpiColWidth: isDesktop ? ('23.5%' as const) : ('48.1%' as const),
    twoColWidth: isDesktop ? ('48.5%' as const) : ('100%' as const),
  };
}
