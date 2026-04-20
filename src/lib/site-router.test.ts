import { describe, it, expect } from "vitest";
import { routeHref, normalizeHashRoute, sitePaths } from './site-router.ts';

describe('site-router', () => {
  describe('routeHref', () => {
    it('should correctly prefix all valid site paths with #', () => {
      sitePaths.forEach((path) => {
        expect(routeHref(path)).toBe(`#${path}`);
      });
    });
  });

  describe('normalizeHashRoute', () => {
    it('should normalize standard hash routes', () => {
      expect(normalizeHashRoute('#/analyzer')).toBe('/analyzer');
      expect(normalizeHashRoute('#/method')).toBe('/method');
    });

    it('should handle routes without hash prefix', () => {
      expect(normalizeHashRoute('/safety')).toBe('/safety');
      expect(normalizeHashRoute('/admin')).toBe('/admin');
    });

    it('should handle root routes', () => {
      expect(normalizeHashRoute('#')).toBe('/');
      expect(normalizeHashRoute('#/')).toBe('/');
      expect(normalizeHashRoute('')).toBe('/');
    });

    it('should fallback to /404 for unknown routes', () => {
      expect(normalizeHashRoute('#/unknown')).toBe('/404');
      expect(normalizeHashRoute('random')).toBe('/404');
    });

    it('should handle edge cases like whitespace, casing, query parameters, multiple hashes, and single slashes', () => {
      // Whitespace
      expect(normalizeHashRoute(' #/analyzer ')).toBe('/analyzer');
      // Case variations - should be normalized to lowercase
      expect(normalizeHashRoute('#/ANALYZER')).toBe('/analyzer');
      expect(normalizeHashRoute('')).toBe('/');
      expect(normalizeHashRoute(' ')).toBe('/');
      expect(normalizeHashRoute('/')).toBe('/');
      expect(normalizeHashRoute('##/analyzer')).toBe('/analyzer');
      expect(normalizeHashRoute('#/analyzer?q=1')).toBe('/analyzer');
    });
  });
});
