/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTypewriter } from './useTypewriter';

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initializes with empty string and isComplete false', () => {
    const { result } = renderHook(() => useTypewriter('hello', 50, 0));
    expect(result.current.displayedText).toBe('');
    expect(result.current.isComplete).toBe(false);
  });

  it('types text character by character based on speed', () => {
    const { result } = renderHook(() => useTypewriter('hi', 50, 0));

    // Start delay is 0, so timeout fires immediately. Then interval starts.
    // Interval 1 (50ms): currentIndex=0 -> sets to ""
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.displayedText).toBe('');
    expect(result.current.isComplete).toBe(false);

    // Interval 2 (100ms): currentIndex=1 -> sets to "h"
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.displayedText).toBe('h');
    expect(result.current.isComplete).toBe(false);

    // Interval 3 (150ms): currentIndex=2 -> sets to "hi"
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.displayedText).toBe('hi');
    expect(result.current.isComplete).toBe(false);

    // Interval 4 (200ms): currentIndex=3 -> completes
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.displayedText).toBe('hi');
    expect(result.current.isComplete).toBe(true);
  });

  it('respects startDelay before beginning to type', () => {
    const { result } = renderHook(() => useTypewriter('hi', 50, 500));

    // Advance just before startDelay finishes
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current.displayedText).toBe('');
    expect(result.current.isComplete).toBe(false);

    // Finish startDelay (1ms) + first interval tick (50ms) -> currentIndex=0 sets ""
    act(() => {
      vi.advanceTimersByTime(51);
    });
    expect(result.current.displayedText).toBe('');
    expect(result.current.isComplete).toBe(false);

    // Second interval tick (50ms) -> currentIndex=1 sets "h"
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.displayedText).toBe('h');
  });

  it('resets state when text prop changes', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriter(text, 50, 0),
      { initialProps: { text: 'hi' } }
    );

    // Wait for "hi" to complete (50ms * 4 ticks = 200ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.displayedText).toBe('hi');
    expect(result.current.isComplete).toBe(true);

    // Rerender with new text
    rerender({ text: 'new' });

    // Should immediately reset
    expect(result.current.displayedText).toBe('');
    expect(result.current.isComplete).toBe(false);

    // Wait for "new" to complete (50ms * 5 ticks = 250ms)
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.displayedText).toBe('new');
    expect(result.current.isComplete).toBe(true);
  });

  it('cleans up timeouts and intervals on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() => useTypewriter('hi', 50, 0));

    // Advance timers so the interval is created
    act(() => {
      vi.advanceTimersByTime(10);
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
