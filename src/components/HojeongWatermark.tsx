import React from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';

interface HojeongWatermarkProps {
  text?: string;
  opacity?: number;
}

const DEFAULT_TEXT = 'HOJEONG';

export default function HojeongWatermark({
  text = DEFAULT_TEXT,
  opacity = 0.04,
}: HojeongWatermarkProps) {
  if (Platform.OS === 'web') {
    // Generate clean repeating SVG data URI for crisp, infinite vector rendering
    const svgContent =
      `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="130" viewBox="0 0 240 130">` +
        `<text x="120" y="65" text-anchor="middle" dominant-baseline="middle" ` +
        `transform="rotate(-25 120 65)" ` +
        `fill="rgba(215, 25, 32, ${opacity})"` +
        `font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" ` +
        `font-weight="900" font-size="14" letter-spacing="3.5">${text}</text>` +
      `</svg>`;

    const svgUrl = `url("data:image/svg+xml,${encodeURIComponent(svgContent)}")`;

    return (
      <View
        pointerEvents="none"
        aria-hidden="true"
        style={[
          styles.overlay,
          {
            // @ts-ignore Web-only CSS background properties
            backgroundImage: svgUrl,
            backgroundRepeat: 'repeat',
            backgroundPosition: '0 0',
          },
        ]}
      />
    );
  }

  // Native fallback: Matrix of rotating text elements
  const rows = Array.from({ length: 14 }, (_, i) => i);
  const cols = Array.from({ length: 6 }, (_, j) => j);

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={[styles.nativeGrid, { opacity }]}>
        {rows.map((r) => (
          <View key={`row-${r}`} style={styles.nativeRow}>
            {cols.map((c) => (
              <View key={`col-${r}-${c}`} style={styles.nativeCell}>
                <Text style={styles.nativeText}>{text}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  nativeGrid: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-around',
  },
  nativeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 18,
  },
  nativeCell: {
    transform: [{ rotate: '-25deg' }],
  },
  nativeText: {
    color: '#D71920',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3.5,
  },
});
