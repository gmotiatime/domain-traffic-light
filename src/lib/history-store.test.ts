import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { renderHook, act } from "@testing-library/react";
import { JSDOM } from "jsdom";

// Setup basic DOM environment for React to run in browser mode
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: "http://localhost" });
globalThis.window = dom.window as any;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator });

import { useHistory } from "./history-store.ts";

// Helper to reset mocks between tests
let originalLocalStorage: Storage;

beforeEach(() => {
  originalLocalStorage = globalThis.window.localStorage;
});

afterEach(() => {
  Object.defineProperty(globalThis.window, "localStorage", {
    value: originalLocalStorage,
    writable: true,
  });
});

describe("useHistory", () => {
  test("handles localStorage.getItem error on mount", () => {
    // Break localStorage.getItem
    const mockStorage = {
      getItem: () => { throw new Error("Mock get error"); },
      setItem: () => {},
      removeItem: () => {},
    };
    Object.defineProperty(globalThis.window, "localStorage", {
      value: mockStorage,
      writable: true,
    });

    // Should not throw, should fall back to empty array
    const { result } = renderHook(() => useHistory());
    assert.strictEqual(result.current.history.length, 0);
  });

  test("handles localStorage.setItem error on addHistory", () => {
    // Break localStorage.setItem (e.g. QuotaExceededError)
    const mockStorage = {
      getItem: () => null,
      setItem: () => { throw new Error("Mock set error (Quota)"); },
      removeItem: () => {},
    };
    Object.defineProperty(globalThis.window, "localStorage", {
      value: mockStorage,
      writable: true,
    });

    const { result } = renderHook(() => useHistory());

    // Attempting to add history should not throw, but should update in-memory state
    act(() => {
      result.current.addHistory("example.com", "high");
    });

    assert.strictEqual(result.current.history.length, 1);
    assert.strictEqual(result.current.history[0].domain, "example.com");
    assert.strictEqual(result.current.history[0].verdict, "high");
  });

  test("loads from and saves to localStorage successfully", () => {
    const fakeInitialHistory = [
      { id: "123", domain: "existing.com", verdict: "low", timestamp: 1000 }
    ];
    let storedData = JSON.stringify(fakeInitialHistory);

    const mockStorage = {
      getItem: () => storedData,
      setItem: (key: string, value: string) => { storedData = value; },
      removeItem: () => { storedData = ""; },
    };
    Object.defineProperty(globalThis.window, "localStorage", {
      value: mockStorage,
      writable: true,
    });

    const { result } = renderHook(() => useHistory());

    // Check it loaded correctly
    assert.strictEqual(result.current.history.length, 1);
    assert.strictEqual(result.current.history[0].domain, "existing.com");

    // Add a new item
    act(() => {
      result.current.addHistory("new-domain.com", "medium");
    });

    // Check memory state
    assert.strictEqual(result.current.history.length, 2);
    assert.strictEqual(result.current.history[0].domain, "new-domain.com");
    assert.strictEqual(result.current.history[1].domain, "existing.com");

    // Check localStorage state
    const saved = JSON.parse(storedData);
    assert.strictEqual(saved.length, 2);
    assert.strictEqual(saved[0].domain, "new-domain.com");
  });
});
