import { TextStyle, Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  web: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  default: 'System',
});

export const typography: Record<string, TextStyle> = {
  display: {
    fontFamily,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 0,
  },
  bodyLg: {
    fontFamily,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: 0,
  },
  body: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  bodySm: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  caption: {
    fontFamily,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mono: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      web: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      default: 'monospace',
    }),
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
};

export type Typography = typeof typography;
