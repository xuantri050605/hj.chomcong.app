import { useRef } from 'react';
import { Animated, Platform } from 'react-native';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export interface ButtonPressAnimResult {
  scale: Animated.Value;
  onPressIn: () => void;
  onPressOut: () => void;
  style: {
    transform: [{ scale: Animated.Value }];
  };
}

/**
 * Built-in Animated hook for micro-scale button press interactions (60fps).
 */
export function useButtonPressAnim(): ButtonPressAnimResult {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      friction: 8,
      tension: 100,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  return {
    scale,
    onPressIn,
    onPressOut,
    style: {
      transform: [{ scale }],
    },
  };
}
