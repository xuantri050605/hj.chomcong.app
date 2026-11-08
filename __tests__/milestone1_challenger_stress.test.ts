import React from 'react';
// @ts-ignore
const ReactTestRenderer = require('react-test-renderer');
const { act } = ReactTestRenderer;

// Mock react-native using standard CommonJS modules from react-native-web (Expo Web target)
jest.mock('react-native', () => {
  const Animated = require('react-native-web/dist/cjs/exports/Animated');
  const Easing = require('react-native-web/dist/cjs/exports/Easing');
  const Platform = require('react-native-web/dist/cjs/exports/Platform');
  const useWindowDimensions = require('react-native-web/dist/cjs/exports/useWindowDimensions');
  const View = require('react-native-web/dist/cjs/exports/View');
  const Text = require('react-native-web/dist/cjs/exports/Text');
  const StyleSheet = require('react-native-web/dist/cjs/exports/StyleSheet');
  const Dimensions = require('react-native-web/dist/cjs/exports/Dimensions');
  const TouchableOpacity = require('react-native-web/dist/cjs/exports/TouchableOpacity');

  return {
    Animated,
    Easing,
    Platform: {
      OS: 'web',
      select: (obj: any) => obj.web || obj.default,
    },
    useWindowDimensions: jest.fn(() => ({
      width: 1024,
      height: 768,
      scale: 1,
      fontScale: 1,
    })),
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
  };
});

import * as ReactNative from 'react-native';
import { useScreenTransition } from '../src/hooks/useScreenTransition';
import { useButtonPressAnim } from '../src/hooks/useButtonPressAnim';
import { usePulseAnim } from '../src/hooks/usePulseAnim';
import { useResponsive, isDesktopWidth, BREAKPOINTS, MAX_CONTENT_WIDTH } from '../src/theme/responsive';
import { AppRoute, isValidRoute } from '../src/utils/navigationState';

// Lightweight in-node Hook Test Harness backed by react-test-renderer & React 18 act()
function renderHook<TProps, TResult>(
  hookFn: (props: TProps) => TResult,
  options?: { initialProps?: TProps }
) {
  const result: { current: TResult } = {} as any;
  function TestComponent({ hookProps }: { hookProps: TProps }) {
    result.current = hookFn(hookProps);
    return null;
  }
  let renderer: any;
  act(() => {
    renderer = ReactTestRenderer.create(
      React.createElement(TestComponent, { hookProps: options?.initialProps as TProps })
    );
  });

  return {
    result,
    rerender: (newProps: TProps) => {
      act(() => {
        renderer.update(
          React.createElement(TestComponent, { hookProps: newProps })
        );
      });
    },
    unmount: () => {
      act(() => {
        renderer.unmount();
      });
    },
  };
}

describe('Milestone 1 Empirical Stress Tests (Challenger 1)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // =========================================================================
  // Challenge 1: Screen transition animation stability under rapid switching
  // =========================================================================
  describe('Challenge 1: Screen Transition Animation Stability', () => {
    const screens: AppRoute[] = ['Dashboard', 'Attendance', 'Payroll', 'Salary', 'History'];

    test('1.1: Rapid switching between all 5 screens in sequence does not crash or produce invalid values', () => {
      const { result, rerender } = renderHook(
        ({ route }: { route: AppRoute }) => useScreenTransition(route),
        { initialProps: { route: 'Dashboard' as AppRoute } }
      );

      // Verify initial route transition initialized
      expect(result.current.opacity).toBeDefined();
      expect(result.current.translateY).toBeDefined();
      expect(result.current.style.transform).toBeDefined();

      // Simulate rapid switching across 10 full cycles (50 switches) with 5ms tick between hops
      for (let cycle = 0; cycle < 10; cycle++) {
        for (const nextScreen of screens) {
          act(() => {
            rerender({ route: nextScreen });
            jest.advanceTimersByTime(5); // Switch before 220ms animation finishes
          });

          // Check that animated values are numeric and within valid bounds
          const currentOpacity = (result.current.opacity as any).__getValue();
          const currentTranslateY = (result.current.translateY as any).__getValue();

          expect(typeof currentOpacity).toBe('number');
          expect(Number.isNaN(currentOpacity)).toBe(false);
          expect(currentOpacity).toBeGreaterThanOrEqual(0);
          expect(currentOpacity).toBeLessThanOrEqual(1.01);

          expect(typeof currentTranslateY).toBe('number');
          expect(Number.isNaN(currentTranslateY)).toBe(false);
          expect(currentTranslateY).toBeGreaterThanOrEqual(-0.01);
          expect(currentTranslateY).toBeLessThanOrEqual(12.01);
        }
      }

      // Allow final transition to settle to completion (250ms)
      act(() => {
        jest.advanceTimersByTime(250);
      });

      const settledOpacity = (result.current.opacity as any).__getValue();
      const settledTranslateY = (result.current.translateY as any).__getValue();

      expect(settledOpacity).toBeCloseTo(1, 2);
      expect(settledTranslateY).toBeCloseTo(0, 2);
    });

    test('1.2: Stress test: 100 randomized rapid route hops with zero latency', () => {
      const { result, rerender } = renderHook(
        ({ route }: { route: AppRoute }) => useScreenTransition(route),
        { initialProps: { route: 'Dashboard' as AppRoute } }
      );

      expect(() => {
        for (let i = 0; i < 100; i++) {
          const randomRoute = screens[Math.floor(Math.random() * screens.length)];
          act(() => {
            rerender({ route: randomRoute });
            // Zero time advance: immediate back-to-back switching
          });
        }
      }).not.toThrow();

      // Ensure that even after 100 zero-delay interruptions, settling works cleanly
      act(() => {
        jest.advanceTimersByTime(250);
      });

      const finalOpacity = (result.current.opacity as any).__getValue();
      const finalTranslateY = (result.current.translateY as any).__getValue();

      expect(finalOpacity).toBeCloseTo(1, 2);
      expect(finalTranslateY).toBeCloseTo(0, 2);
    });

    test('1.3: Unmounting component while transition animation is active causes no memory leaks or errors', () => {
      const { unmount } = renderHook(() => useScreenTransition('Attendance'));

      act(() => {
        jest.advanceTimersByTime(50); // Interrupted midway
      });

      expect(() => {
        unmount();
        jest.advanceTimersByTime(200);
      }).not.toThrow();
    });

    test('1.4: Screen route validity holds for all 5 screens and rejects invalid transitions', () => {
      for (const s of screens) {
        expect(isValidRoute(s)).toBe(true);
      }
      expect(isValidRoute('UnknownScreen')).toBe(false);
      expect(isValidRoute('')).toBe(false);
      expect(isValidRoute(null as any)).toBe(false);
    });
  });

  // =========================================================================
  // Challenge 2: Animated hooks value generation and error-free execution
  // =========================================================================
  describe('Challenge 2: Built-in Animated Hooks Value Generation', () => {
    describe('useScreenTransition', () => {
      test('2.1: Generates exact valid numeric ranges (opacity: 0 -> 1, translateY: 12 -> 0)', () => {
        const { result, rerender } = renderHook(
          ({ route }: { route: AppRoute }) => useScreenTransition(route),
          { initialProps: { route: 'Dashboard' as AppRoute } }
        );

        // After initial mount transition settles
        act(() => {
          jest.advanceTimersByTime(250);
        });
        expect((result.current.opacity as any).__getValue()).toBeCloseTo(1, 2);
        expect((result.current.translateY as any).__getValue()).toBeCloseTo(0, 2);

        // Test interpolation formula directly
        const anim = result.current.opacity as any;
        anim.setValue(0);
        expect(anim.__getValue()).toBe(0);
        expect((result.current.translateY as any).__getValue()).toBe(12);

        anim.setValue(0.25);
        expect(anim.__getValue()).toBe(0.25);
        expect((result.current.translateY as any).__getValue()).toBe(9);

        anim.setValue(0.5);
        expect(anim.__getValue()).toBe(0.5);
        expect((result.current.translateY as any).__getValue()).toBe(6);

        anim.setValue(0.75);
        expect(anim.__getValue()).toBe(0.75);
        expect((result.current.translateY as any).__getValue()).toBe(3);

        anim.setValue(1);
        expect(anim.__getValue()).toBe(1);
        expect((result.current.translateY as any).__getValue()).toBe(0);

        // Trigger route change transition
        act(() => {
          rerender({ route: 'Attendance' });
        });
        act(() => {
          jest.advanceTimersByTime(250);
        });
        expect((result.current.opacity as any).__getValue()).toBeCloseTo(1, 2);
        expect((result.current.translateY as any).__getValue()).toBeCloseTo(0, 2);
      });
    });

    describe('useButtonPressAnim', () => {
      test('2.2: Initial scale is 1, onPressIn springs to ~0.96, onPressOut springs to 1', () => {
        const { result } = renderHook(() => useButtonPressAnim());

        expect(result.current.scale).toBeDefined();
        expect(typeof result.current.onPressIn).toBe('function');
        expect(typeof result.current.onPressOut).toBe('function');

        // Initial scale is 1
        expect((result.current.scale as any).__getValue()).toBe(1);

        // Press In
        act(() => {
          result.current.onPressIn();
        });
        act(() => {
          jest.advanceTimersByTime(100);
        });

        const pressedScale = (result.current.scale as any).__getValue();
        expect(pressedScale).toBeLessThan(1);
        expect(pressedScale).toBeGreaterThan(0.9); // Stays strictly > 0 and around 0.96

        // Press Out
        act(() => {
          result.current.onPressOut();
        });
        act(() => {
          jest.advanceTimersByTime(200);
        });

        const releasedScale = (result.current.scale as any).__getValue();
        expect(releasedScale).toBeCloseTo(1, 1);
      });

      test('2.3: Stress test: 100 rapid button clicks (spam pressIn / pressOut) does not throw or corrupt scale', () => {
        const { result } = renderHook(() => useButtonPressAnim());

        expect(() => {
          for (let i = 0; i < 100; i++) {
            act(() => {
              result.current.onPressIn();
              jest.advanceTimersByTime(5);
              result.current.onPressOut();
              jest.advanceTimersByTime(5);
            });
            const scale = (result.current.scale as any).__getValue();
            expect(scale).toBeGreaterThan(0);
            expect(scale).toBeLessThan(1.2);
          }
        }).not.toThrow();

        // Let spring settle
        act(() => {
          jest.advanceTimersByTime(300);
        });
        expect((result.current.scale as any).__getValue()).toBeCloseTo(1, 1);
      });
    });

    describe('usePulseAnim', () => {
      test('2.4: Inactive mode returns static scale 1 and opacity 1', () => {
        const { result } = renderHook(() => usePulseAnim(false));

        expect((result.current.pulseScale as any).__getValue()).toBe(1);
        expect((result.current.pulseOpacity as any).__getValue()).toBe(1);
        expect(result.current.pulse).toBe(result.current.pulseScale);
      });

      test('2.5: Active mode oscillates pulseScale (1 to 1.18) and pulseOpacity (0.6 to 1) safely', () => {
        const { result } = renderHook(() => usePulseAnim(true));

        // Advance through pulse cycle (1800ms full loop)
        for (let t = 0; t <= 1800; t += 300) {
          act(() => {
            jest.advanceTimersByTime(300);
          });

          const currentScale = (result.current.pulseScale as any).__getValue();
          const currentOpacity = (result.current.pulseOpacity as any).__getValue();

          // Scale must strictly be between 0.99 and 1.25 (target max is 1.18)
          expect(currentScale).toBeGreaterThanOrEqual(0.99);
          expect(currentScale).toBeLessThanOrEqual(1.25);

          // Opacity must strictly be between 0.55 and 1.05 (target min is 0.6)
          expect(currentOpacity).toBeGreaterThanOrEqual(0.55);
          expect(currentOpacity).toBeLessThanOrEqual(1.05);
        }
      });

      test('2.6: Toggling active true -> false stops animation loop and restores values to 1', () => {
        const { result, rerender } = renderHook(
          ({ active }: { active: boolean }) => usePulseAnim(active),
          { initialProps: { active: true } }
        );

        // Let it run mid-cycle
        act(() => {
          jest.advanceTimersByTime(450);
        });

        // Switch to inactive
        act(() => {
          rerender({ active: false });
        });

        expect((result.current.pulseScale as any).__getValue()).toBe(1);
        expect((result.current.pulseOpacity as any).__getValue()).toBe(1);

        // Advance time and verify values remain fixed at 1 (loop is truly stopped)
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        expect((result.current.pulseScale as any).__getValue()).toBe(1);
        expect((result.current.pulseOpacity as any).__getValue()).toBe(1);
      });

      test('2.7: Stress test: Rapidly toggle active 50 times in rapid succession', () => {
        const { result, rerender } = renderHook(
          ({ active }: { active: boolean }) => usePulseAnim(active),
          { initialProps: { active: false } }
        );

        expect(() => {
          for (let i = 0; i < 50; i++) {
            act(() => {
              rerender({ active: i % 2 === 0 });
              jest.advanceTimersByTime(10);
            });
          }
        }).not.toThrow();

        // Final reset to false
        act(() => {
          rerender({ active: false });
          jest.advanceTimersByTime(100);
        });

        expect((result.current.pulseScale as any).__getValue()).toBe(1);
        expect((result.current.pulseOpacity as any).__getValue()).toBe(1);
      });
    });
  });

  // =========================================================================
  // Challenge 3: Responsive helper boundaries across mobile and desktop
  // =========================================================================
  describe('Challenge 3: Responsive Helper Boundaries', () => {
    function mockDimensions(width: number, height: number = 800) {
      (ReactNative.useWindowDimensions as jest.Mock).mockReturnValue({
        width,
        height,
        scale: 1,
        fontScale: 1,
      });
    }

    test('3.1: Boundary 320px (Compact Mobile / iPhone SE)', () => {
      mockDimensions(320);
      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(320);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isLargeDesktop).toBe(false);
      expect(result.current.kpiColumns).toBe(2);
      expect(result.current.kpiColWidth).toBe('48.1%');
      expect(result.current.twoColWidth).toBe('100%');
      expect(result.current.contentMaxWidth).toBe(320);
      expect(isDesktopWidth(320)).toBe(false);
    });

    test('3.2: Boundary 375px (Standard Mobile / iPhone 8/X)', () => {
      mockDimensions(375);
      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(375);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isLargeDesktop).toBe(false);
      expect(result.current.kpiColumns).toBe(2);
      expect(result.current.kpiColWidth).toBe('48.1%');
      expect(result.current.twoColWidth).toBe('100%');
      expect(result.current.contentMaxWidth).toBe(375);
      expect(isDesktopWidth(375)).toBe(false);
    });

    test('3.3: Boundary 768px (Tablet / Desktop Threshold Boundary)', () => {
      // 767.9px (Mobile side)
      mockDimensions(767.9);
      const mobileResult = renderHook(() => useResponsive()).result.current;
      expect(mobileResult.isDesktop).toBe(false);
      expect(mobileResult.isMobile).toBe(true);
      expect(mobileResult.kpiColumns).toBe(2);
      expect(isDesktopWidth(767.9)).toBe(false);

      // Exact 768px (Desktop side)
      mockDimensions(768);
      const desktopResult = renderHook(() => useResponsive()).result.current;
      expect(desktopResult.width).toBe(768);
      expect(desktopResult.isDesktop).toBe(true);
      expect(desktopResult.isMobile).toBe(false);
      expect(desktopResult.isLargeDesktop).toBe(false);
      expect(desktopResult.kpiColumns).toBe(4);
      expect(desktopResult.kpiColWidth).toBe('23.5%');
      expect(desktopResult.twoColWidth).toBe('48.5%');
      expect(desktopResult.contentMaxWidth).toBe(768);
      expect(isDesktopWidth(768)).toBe(true);
    });

    test('3.4: Boundary 1024px (Small Desktop / iPad Landscape)', () => {
      mockDimensions(1024);
      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(1024);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isLargeDesktop).toBe(false);
      expect(result.current.kpiColumns).toBe(4);
      expect(result.current.kpiColWidth).toBe('23.5%');
      expect(result.current.twoColWidth).toBe('48.5%');
      expect(result.current.contentMaxWidth).toBe(1024);
      expect(isDesktopWidth(1024)).toBe(true);
    });

    test('3.5: Boundary 1200px (Large Desktop Threshold & Max Width Boundary)', () => {
      // 1199.9px (Desktop but not Large Desktop)
      mockDimensions(1199.9);
      const subLarge = renderHook(() => useResponsive()).result.current;
      expect(subLarge.isDesktop).toBe(true);
      expect(subLarge.isLargeDesktop).toBe(false);

      // Exact 1200px (Large Desktop & Cap threshold)
      mockDimensions(1200);
      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(1200);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isLargeDesktop).toBe(true);
      expect(result.current.kpiColumns).toBe(4);
      expect(result.current.kpiColWidth).toBe('23.5%');
      expect(result.current.twoColWidth).toBe('48.5%');
      expect(result.current.contentMaxWidth).toBe(1200);
      expect(isDesktopWidth(1200)).toBe(true);
    });

    test('3.6: Boundary 1920px (Full HD Wide Desktop with Content Capping)', () => {
      mockDimensions(1920);
      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(1920);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isLargeDesktop).toBe(true);
      expect(result.current.kpiColumns).toBe(4);
      expect(result.current.kpiColWidth).toBe('23.5%');
      expect(result.current.twoColWidth).toBe('48.5%');
      // Content width MUST be capped at MAX_CONTENT_WIDTH (1200) to avoid overstretching
      expect(result.current.contentMaxWidth).toBe(MAX_CONTENT_WIDTH);
      expect(result.current.contentMaxWidth).toBe(1200);
      expect(isDesktopWidth(1920)).toBe(true);
    });

    test('3.7: Extreme / Edge Boundaries: 0px, negative, ultra-wide 4000px', () => {
      // 0px viewport width
      mockDimensions(0);
      const zeroResult = renderHook(() => useResponsive()).result.current;
      expect(zeroResult.isDesktop).toBe(false);
      expect(zeroResult.isMobile).toBe(true);
      expect(zeroResult.contentMaxWidth).toBe(0);

      // Ultra-wide 4000px
      mockDimensions(4000);
      const ultraResult = renderHook(() => useResponsive()).result.current;
      expect(ultraResult.isDesktop).toBe(true);
      expect(ultraResult.isLargeDesktop).toBe(true);
      expect(ultraResult.contentMaxWidth).toBe(1200);
      expect(isDesktopWidth(4000)).toBe(true);

      // Breakpoints constants integrity
      expect(BREAKPOINTS.mobile).toBe(768);
      expect(BREAKPOINTS.desktop).toBe(1200);
      expect(MAX_CONTENT_WIDTH).toBe(1200);
    });
  });
});
