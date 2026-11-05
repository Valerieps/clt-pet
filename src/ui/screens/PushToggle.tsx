import { useCallback, useEffect, useState } from 'react';
import type { PushState } from '../../application/ports';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { useToast } from '../toast';
import { useQuery } from '../use-query';

/** Turns the reminders on or off for this device (docs/spec/lembretes.md). */
export function PushToggle() {
  const { backend, push } = useServices();
  const toast = useToast();
  const info = useQuery('push', {}, []);
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(() => void push.state().then(setState), [push]);
  useEffect(refresh, [refresh]);

  async function enable() {
    if (!info.data?.publicKey) return;
    setBusy(true);
    setFailed(false);
    const keys = await push.enable(info.data.publicKey);
    const saved = keys ? await backend.command('push.subscribe', keys) : null;
    if (!saved?.ok) {
      // A subscription the server does not know would only look like it works.
      await push.disable();
      // Refusing the permission prompt is not an error: the "blocked" notice explains it.
      setFailed(Notification.permission !== 'denied');
    } else toast(strings.toast.pushOn);
    setBusy(false);
    refresh();
  }

  async function disable() {
    setBusy(true);
    const endpoint = await push.disable();
    if (endpoint) await backend.command('push.unsubscribe', { endpoint });
    toast(strings.toast.pushOff);
    setBusy(false);
    refresh();
  }

  if (state === null || info.loading) return null;
  const notConfigured = info.data?.publicKey === null;

  return (
    <section aria-labelledby="push-title">
      <h2 id="push-title">{strings.push.title}</h2>
      <p className="muted">{strings.push.explain}</p>
      {state === 'unsupported' && <p className="notice">{strings.push.unsupported}</p>}
      {state === 'denied' && <p className="notice">{strings.push.denied}</p>}
      {notConfigured && state !== 'unsupported' && <p className="notice">{strings.push.notConfigured}</p>}
      {state === 'on' && <p>{strings.push.on}</p>}
      {state === 'off' && !notConfigured && (
        <button type="button" disabled={busy} onClick={() => void enable()}>
          {strings.push.enable}
        </button>
      )}
      {state === 'on' && (
        <button type="button" className="secondary" disabled={busy} onClick={() => void disable()}>
          {strings.push.disable}
        </button>
      )}
      {failed && (
        <p className="notice" role="alert">
          {strings.push.failed}
        </p>
      )}
    </section>
  );
}
