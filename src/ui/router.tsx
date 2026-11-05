// A tiny router over the History API: the app has a handful of screens and no router dependency.
import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';

const listeners = new Set<() => void>();

let pushed = 0; // entries this page load added to the history: back only leaves the app when it is 0

export function navigate(path: string, options: { replace?: boolean } = {}): void {
  if (options.replace) window.history.replaceState(null, '', path);
  else {
    window.history.pushState(null, '', path);
    pushed += 1;
  }
  listeners.forEach((l) => l());
}

/** Closes a layer: back to where the person came from, or to `fallback` when the layer was the entry point. */
export function goBack(fallback: string): void {
  if (pushed > 0) {
    pushed -= 1;
    window.history.back();
  } else {
    navigate(fallback, { replace: true });
  }
}

export function usePath(): string {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    listeners.add(update);
    window.addEventListener('popstate', update);
    return () => {
      listeners.delete(update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return path;
}

export function Link({ to, replace = false, ...rest }: { to: string; replace?: boolean } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(to, { replace });
  };
  return <a {...rest} href={to} onClick={onClick} />;
}
