import { describe, it } from 'node:test';
import assert from 'node:assert';
import { cn } from './utils.ts';

describe('cn utility', () => {
  it('should handle basic string class names', () => {
    assert.strictEqual(cn('foo', 'bar'), 'foo bar');
  });

  it('should handle conditional class names', () => {
    assert.strictEqual(cn('foo', true && 'bar', false && 'baz'), 'foo bar');
    assert.strictEqual(cn({ foo: true, bar: false }), 'foo');
  });

  it('should merge tailwind classes and resolve conflicts', () => {
    assert.strictEqual(cn('p-2', 'p-4'), 'p-4');
    assert.strictEqual(cn('px-2 py-1', 'p-4'), 'p-4');
    assert.strictEqual(cn('text-red-500', 'text-blue-500'), 'text-blue-500');
    assert.strictEqual(cn('bg-red-500', 'hover:bg-blue-500'), 'bg-red-500 hover:bg-blue-500');
  });

  it('should handle arrays of class names', () => {
    assert.strictEqual(cn(['foo', 'bar']), 'foo bar');
    assert.strictEqual(cn(['foo', ['bar', 'baz']]), 'foo bar baz');
  });

  it('should handle falsy values', () => {
    assert.strictEqual(cn('foo', null, undefined, 0, false, '', 'bar'), 'foo bar');
  });
});
