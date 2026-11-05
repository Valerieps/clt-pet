import { describe, expect, it } from 'vitest';
import { nextFocusIndex } from './focus-trap';

describe('nextFocusIndex', () => {
  it('moves forward and wraps to the first', () => {
    expect(nextFocusIndex(3, 0, false)).toBe(1);
    expect(nextFocusIndex(3, 2, false)).toBe(0);
  });
  it('moves backwards and wraps to the last', () => {
    expect(nextFocusIndex(3, 1, true)).toBe(0);
    expect(nextFocusIndex(3, 0, true)).toBe(2);
  });
  it('enters the layer from outside', () => {
    expect(nextFocusIndex(3, -1, false)).toBe(0);
    expect(nextFocusIndex(3, -1, true)).toBe(2);
  });
  it('has nowhere to go without focusable elements', () => {
    expect(nextFocusIndex(0, -1, false)).toBe(-1);
  });
});
