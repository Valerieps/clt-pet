// A short confirmation after a successful save: one message at a time, announced politely.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Toast } from './parts';

/** How long a confirmation stays on screen. */
export const TOAST_MS = 4000;

type Show = (message: string) => void;

const ToastContext = createContext<Show>(() => {});

/** Shows `message` as a toast; a new message replaces the one on screen. */
export const useToast = (): Show => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback<Show>((next) => {
    clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), TOAST_MS);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Toast message={message} />
    </ToastContext.Provider>
  );
}
