import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import { theme } from '../theme/theme';

export interface StatCardProps {
  title: string;
  value: string;
  small?: boolean;
  icon?: React.ReactNode;
  tone?: string;
  subtitle?: string;
}

export default function StatCard({
  title,
  value,
  small,
  icon,
  tone = theme.colors.primary,
  subtitle,
}: StatCardProps) {
  return (
    <Card style={styles.root}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title.toUpperCase()}
        </Text>
        {icon ? (
          <View style={[styles.iconBadge, { backgroundColor: `${tone}18` }]}>
            {icon}
          </View>
        ) : (
          <View style={[styles.dot, { backgroundColor: tone }]} />
        )}
      </View>
      <Text style={[styles.value, small ? styles.small : null]} numberOfLines={2}>
        {value}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={[styles.bottomAccentBar, { backgroundColor: tone }]} />
    </Card>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: 16,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: theme.colors.slate500,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    flex: 1,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.slate900,
    letterSpacing: -0.3,
  },
  small: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.slate400,
    marginTop: 4,
    fontWeight: '500',
  },
  bottomAccentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.9,
  },
});
