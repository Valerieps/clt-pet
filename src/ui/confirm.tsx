// A confirmation drawer in the app's own look, in place of window.confirm.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '../domain/strings';
import { CloseIcon, Layer, useEscape } from './parts';

type Ask = (message: string) => Promise<boolean>;

const ConfirmContext = createContext<Ask>(() => Promise.resolve(false));

/** `if (!(await confirm('Apagar?'))) return;` — resolves true on the destructive button, false on anything else. */
export const useConfirm = (): Ask => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const resolver = useRef<((answer: boolean) => void) | null>(null);

  const ask = useCallback<Ask>((text) => {
    resolver.current?.(false);
    setMessage(text);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const answer = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setMessage(null);
  }, []);

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {message !== null && createPortal(<ConfirmDrawer message={message} onAnswer={answer} />, document.body)}
    </ConfirmContext.Provider>
  );
}

function ConfirmDrawer({ message, onAnswer }: { message: string; onAnswer: (answer: boolean) => void }) {
  const cancel = useCallback(() => onAnswer(false), [onAnswer]);
  useEscape(cancel);
  return (
    <Layer>
      <button type="button" className="scrim" aria-label={strings.confirm.cancel} onClick={cancel} />
      <div className="drawer floating" role="alertdialog" aria-modal="true" aria-label={message}>
        <div className="spread">
          <h2>{message}</h2>
          <button type="button" className="close" aria-label={strings.nav.close} onClick={cancel}>
            <CloseIcon />
          </button>
        </div>
        <div className="actions">
          <button type="button" className="btn line" onClick={cancel}>
            {strings.confirm.cancel}
          </button>
          <button type="button" className="btn danger-fill" onClick={() => onAnswer(true)}>
            {strings.confirm.remove}
          </button>
        </div>
      </div>
    </Layer>
  );
}
