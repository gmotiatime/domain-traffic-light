import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: "http://localhost" });
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator });

import { writeAnalyzerPrefill, consumeAnalyzerPrefill } from "./analyzer-prefill.ts";

describe("analyzer-prefill", () => {
  let mockStorage: Record<string, string>;
  let originalSessionStorage: Storage;
  let originalWindow: Window & typeof globalThis;

  beforeEach(() => {
    mockStorage = {};

    // Setup mock sessionStorage
    originalSessionStorage = globalThis.window.sessionStorage;
    const mockSessionStorage = {
      getItem: vi.fn((key) => mockStorage[key] || null),
      setItem: vi.fn((key, value) => { mockStorage[key] = value.toString(); }),
      removeItem: vi.fn((key) => { delete mockStorage[key]; }),
      clear: vi.fn(() => { mockStorage = {}; }),
      length: 0,
      key: vi.fn(() => null),
    } as unknown as Storage;

    Object.defineProperty(globalThis.window, "sessionStorage", {
      value: mockSessionStorage,
      writable: true,
    });

    // Reset location and history
    dom.reconfigure({ url: "http://localhost/" });
  });

  afterEach(() => {
    Object.defineProperty(globalThis.window, "sessionStorage", {
      value: originalSessionStorage,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  describe("writeAnalyzerPrefill", () => {
    test("writes normalized value to sessionStorage", () => {
      writeAnalyzerPrefill("  example.com  ");
      expect(globalThis.window.sessionStorage.setItem).toHaveBeenCalledWith(
        "domain-traffic-light:analyzer-prefill",
        "example.com"
      );
    });

    test("removes key from sessionStorage when value is empty or spaces", () => {
      writeAnalyzerPrefill("   ");
      expect(globalThis.window.sessionStorage.removeItem).toHaveBeenCalledWith(
        "domain-traffic-light:analyzer-prefill"
      );
      expect(globalThis.window.sessionStorage.setItem).not.toHaveBeenCalled();
    });

    test("returns early without error when window is undefined", () => {
      originalWindow = globalThis.window;
      // @ts-ignore
      delete globalThis.window;

      expect(() => writeAnalyzerPrefill("example.com")).not.toThrow();

      globalThis.window = originalWindow;
    });
  });

  describe("consumeAnalyzerPrefill", () => {
    test("prioritizes and returns prefill parameter from URL hash, and clears it", () => {
      dom.reconfigure({ url: "http://localhost/#/analyzer?prefill=example.com" });

      const replaceStateSpy = vi.spyOn(globalThis.window.history, "replaceState");

      const result = consumeAnalyzerPrefill();

      expect(result).toBe("example.com");
      expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/#/analyzer");
      // ensure we don't access sessionStorage if we found it in URL
      expect(globalThis.window.sessionStorage.getItem).not.toHaveBeenCalled();
    });

    test("falls back to sessionStorage, returns value, and removes key", () => {
      dom.reconfigure({ url: "http://localhost/#/analyzer" });
      mockStorage["domain-traffic-light:analyzer-prefill"] = "storage-example.com";

      const result = consumeAnalyzerPrefill();

      expect(result).toBe("storage-example.com");
      expect(globalThis.window.sessionStorage.getItem).toHaveBeenCalledWith("domain-traffic-light:analyzer-prefill");
      expect(globalThis.window.sessionStorage.removeItem).toHaveBeenCalledWith("domain-traffic-light:analyzer-prefill");
    });

    test("returns empty string when neither URL nor sessionStorage has value", () => {
      dom.reconfigure({ url: "http://localhost/#/analyzer" });

      const result = consumeAnalyzerPrefill();

      expect(result).toBe("");
      expect(globalThis.window.sessionStorage.removeItem).toHaveBeenCalledWith("domain-traffic-light:analyzer-prefill");
    });

    test("safely returns empty string when window is undefined", () => {
      originalWindow = globalThis.window;
      // @ts-ignore
      delete globalThis.window;

      const result = consumeAnalyzerPrefill();

      expect(result).toBe("");

      globalThis.window = originalWindow;
    });
  });
});
