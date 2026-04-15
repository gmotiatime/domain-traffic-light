/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCountUp } from './useCountUp';

describe('useCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default start value of 0', () => {
    const { result } = renderHook(() => useCountUp({ end: 100 }));
    expect(result.current.count).toBe(0);
    expect(result.current.isAnimating).toBe(false);
  });

  it('initializes with provided start value', () => {
    const { result } = renderHook(() => useCountUp({ end: 100, start: 10 }));
    expect(result.current.count).toBe(10);
    expect(result.current.isAnimating).toBe(false);
  });

  it('starts animation and reaches end value over duration', () => {
    const { result } = renderHook(() => useCountUp({ end: 100, duration: 1000, start: 0 }));

    act(() => {
      result.current.startAnimation();
    });

    expect(result.current.isAnimating).toBe(true);

    // Advance time by 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should be somewhere between 0 and 100
    expect(result.current.count).toBeGreaterThan(0);
    expect(result.current.count).toBeLessThan(100);
    expect(result.current.isAnimating).toBe(true);

    // Advance to end - slightly past 1000 to ensure we hit progress 1
    act(() => {
      vi.advanceTimersByTime(550);
    });

    expect(result.current.count).toBe(100);
    expect(result.current.isAnimating).toBe(false);
  });

  it('uses default duration of 2000ms if not provided', () => {
    const { result } = renderHook(() => useCountUp({ end: 100 }));

    act(() => {
      result.current.startAnimation();
    });

    act(() => {
      vi.advanceTimersByTime(1000); // 50%
    });

    expect(result.current.count).toBeGreaterThan(0);
    expect(result.current.count).toBeLessThan(100);

    act(() => {
      vi.advanceTimersByTime(1050); // > 100%
    });

    expect(result.current.count).toBe(100);
    expect(result.current.isAnimating).toBe(false);
  });
});
