import { useRef, useEffect } from 'react';
import { Animated, Easing, Platform } from 'react-native';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export interface PulseAnimResult {
  pulseScale: Animated.Value;
  pulseOpacity: Animated.Value;
  pulse: Animated.Value; // convenient alias
  style: {
    transform: [{ scale: Animated.Value }];
    opacity: Animated.Value;
  };
}

/**
 * Built-in Animated hook for pulsing glow indicators (e.g. active shift status).
 */
export function usePulseAnim(active: boolean): PulseAnimResult {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      pulseScale.setValue(1);
      pulseOpacity.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.18,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0.6,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [active]);

  return {
    pulseScale,
    pulseOpacity,
    pulse: pulseScale,
    style: {
      transform: [{ scale: pulseScale }],
      opacity: pulseOpacity,
    },
  };
}
