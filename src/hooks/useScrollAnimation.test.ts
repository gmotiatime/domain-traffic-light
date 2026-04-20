/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { useScrollAnimation } from './useScrollAnimation';

describe('useScrollAnimation', () => {
  let mockIntersectionObserver: Mock;
  let mockObserve: Mock;
  let mockUnobserve: Mock;
  let observerCallback: (entries: IntersectionObserverEntry[]) => void;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockUnobserve = vi.fn();

    mockIntersectionObserver = vi.fn();
    const MockIntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback, options: any) {
        mockIntersectionObserver(callback, options);
        observerCallback = callback;
      }
      observe = mockObserve;
      unobserve = mockUnobserve;
      disconnect = vi.fn();
    };

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('initializes as not visible', () => {
    const mockRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useScrollAnimation(mockRef));

    expect(result.current).toBe(false);
  });

  it('observes the ref element on mount', () => {
    const mockRef = { current: document.createElement('div') };
    renderHook(() => useScrollAnimation(mockRef));

    expect(mockIntersectionObserver).toHaveBeenCalledTimes(1);
    expect(mockObserve).toHaveBeenCalledWith(mockRef.current);
  });

  it('updates state to true when element intersects', () => {
    const mockRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useScrollAnimation(mockRef));

    act(() => {
      observerCallback([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });

    expect(result.current).toBe(true);
  });

  it('does not update state if element does not intersect', () => {
    const mockRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useScrollAnimation(mockRef));

    act(() => {
      observerCallback([
        { isIntersecting: false } as IntersectionObserverEntry,
      ]);
    });

    expect(result.current).toBe(false);
  });

  it('unobserves element on unmount', () => {
    const mockRef = { current: document.createElement('div') };
    const { unmount } = renderHook(() => useScrollAnimation(mockRef));

    unmount();

    expect(mockUnobserve).toHaveBeenCalledTimes(1);
    expect(mockUnobserve).toHaveBeenCalledWith(mockRef.current);
  });

  it('respects threshold parameter', () => {
    const mockRef = { current: document.createElement('div') };
    const customThreshold = 0.5;

    renderHook(() => useScrollAnimation(mockRef, customThreshold));

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      { threshold: customThreshold }
    );
  });
});
