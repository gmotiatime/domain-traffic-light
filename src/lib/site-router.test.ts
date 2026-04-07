import { describe, it } from 'node:test';
import assert from 'node:assert';
import { routeHref, normalizeHashRoute } from './site-router.ts';

describe('site-router', () => {
  describe('routeHref', () => {
    it('should prefix path with #', () => {
      // @ts-ignore
      assert.strictEqual(routeHref('/analyzer'), '#/analyzer');
      // @ts-ignore
      assert.strictEqual(routeHref('/'), '#/');
    });
  });

  describe('normalizeHashRoute', () => {
    it('should normalize standard hash routes', () => {
      assert.strictEqual(normalizeHashRoute('#/analyzer'), '/analyzer');
      assert.strictEqual(normalizeHashRoute('#/method'), '/method');
    });

    it('should handle routes without hash prefix', () => {
      assert.strictEqual(normalizeHashRoute('/safety'), '/safety');
      assert.strictEqual(normalizeHashRoute('/admin'), '/admin');
    });

    it('should handle root routes', () => {
      assert.strictEqual(normalizeHashRoute('#'), '/');
      assert.strictEqual(normalizeHashRoute('#/'), '/');
      assert.strictEqual(normalizeHashRoute(''), '/');
    });

    it('should fallback to /404 for unknown routes', () => {
      assert.strictEqual(normalizeHashRoute('#/unknown'), '/404');
      assert.strictEqual(normalizeHashRoute('random'), '/404');
    });
  });
});
