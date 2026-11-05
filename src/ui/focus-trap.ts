// Keeps keyboard focus inside a modal layer (drawer).

/** Where Tab or Shift+Tab goes from `current` among `count` focusable elements; wraps at both ends. -1 means "not inside": go to the first. */
export function nextFocusIndex(count: number, current: number, backwards: boolean): number {
  if (count <= 0) return -1;
  if (current < 0) return backwards ? count - 1 : 0;
  return backwards ? (current - 1 + count) % count : (current + 1) % count;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const focusableIn = (root: HTMLElement): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute('inert'));
