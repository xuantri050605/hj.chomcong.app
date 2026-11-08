import { useRef, useEffect } from 'react';
import { Animated, Easing, Platform } from 'react-native';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export interface ScreenTransitionResult {
  opacity: Animated.Value;
  translateY: Animated.AnimatedInterpolation<number>;
  style: {
    opacity: Animated.Value;
    transform: [{ translateY: Animated.AnimatedInterpolation<number> }];
  };
}

/**
 * Built-in Animated hook for 60fps screen route transitions.
 * Smoothly blends opacity and a subtle vertical slide on route change.
 */
export function useScreenTransition(routeKey: string): ScreenTransitionResult {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [routeKey]);

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  return {
    opacity: animValue,
    translateY,
    style: {
      opacity: animValue,
      transform: [{ translateY }],
    },
  };
}
