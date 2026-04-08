import { describe, it, expect } from "vitest";
import { cn } from './utils.ts';

describe('cn utility', () => {
  it('should handle basic string class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional class names', () => {
    expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar');
    expect(cn({ foo: true, bar: false })).toBe('foo');
  });

  it('should merge tailwind classes and resolve conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('px-2 py-1', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('bg-red-500', 'hover:bg-blue-500')).toBe('bg-red-500 hover:bg-blue-500');
  });

  it('should handle arrays of class names', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
    expect(cn(['foo', ['bar', 'baz']])).toBe('foo bar baz');
  });

  it('should handle falsy values', () => {
    expect(cn('foo', null, undefined, 0, false, '', 'bar')).toBe('foo bar');
  });
});
