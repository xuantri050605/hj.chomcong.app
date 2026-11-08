import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { theme } from '../theme/theme';

interface HojeongLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  light?: boolean;
}

export default function HojeongLogo({
  size = 'md',
  showSubtitle = true,
  light = false,
}: HojeongLogoProps) {
  const badgeSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const hSize = size === 'sm' ? 15 : size === 'lg' ? 24 : 19;
  const titleSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  const subSize = size === 'sm' ? 9 : size === 'lg' ? 11 : 10;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize > 32 ? 10 : 8,
            backgroundColor: theme.colors.primary,
          },
        ]}
      >
        <Text style={[styles.badgeLetter, { fontSize: hSize }]}>H</Text>
      </View>
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.brandTitle,
              {
                fontSize: titleSize,
                color: light ? theme.colors.white : theme.colors.primary,
              },
            ]}
          >
            HOJEONG
          </Text>
        </View>
        {showSubtitle && (
          <Text
            style={[
              styles.brandSubtitle,
              {
                fontSize: subSize,
                color: light ? 'rgba(255,255,255,0.7)' : theme.colors.slate500,
              },
            ]}
          >
            Hệ thống chấm công & tính lương
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D71920',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  badgeLetter: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontStyle: 'italic',
    transform: [{ skewX: '-6deg' }],
    letterSpacing: -0.5,
    fontFamily: Platform.select({
      web: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      default: undefined,
    }),
  },
  textContainer: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontWeight: '800',
    letterSpacing: 0.6,
    fontFamily: Platform.select({
      web: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      default: undefined,
    }),
  },
  brandSubtitle: {
    fontWeight: '500',
    letterSpacing: 0.1,
    marginTop: 1,
    fontFamily: Platform.select({
      web: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      default: undefined,
    }),
  },
});
