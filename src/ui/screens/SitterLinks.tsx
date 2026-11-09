// The members' side of the Manual do Funcionário Temporário (docs/spec/manual-temporario.md):
// create, copy and turn off the links.
import { useState, type FormEvent } from 'react';
import { sitterPagePath, type SitterLinkView } from '../../application/api-contract';
import { formatDate } from '../../domain/pets/pet';
import { SITTER_DEFAULT_DAYS, SITTER_LABEL_MAX, SITTER_MAX_DAYS, SITTER_NOTE_MAX } from '../../domain/sitter/sitter';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { usePets } from '../use-pets';
import { useConfirm } from '../confirm';
import { useToast } from '../toast';
import { useQuery } from '../use-query';

const t = strings.sitter;

const linkOf = (token: string) => `${window.location.origin}${sitterPagePath(token)}`;

export function SitterLinks() {
  const links = useQuery('sitterLinks', {}, ['sitter', 'pets']);
  const [creating, setCreating] = useState(false);

  return (
    <div className="stack">
      <h1>{t.title}</h1>
      <p className="muted">{t.explain}</p>
      {creating ? (
        <SitterForm onDone={() => setCreating(false)} />
      ) : (
        <div>
          <button type="button" onClick={() => setCreating(true)}>
            {t.create}
          </button>
        </div>
      )}
      {links.data?.length === 0 && <p className="muted">{t.empty}</p>}
      {links.error && !links.data && <p className="notice">{strings.genericError}</p>}
      <ul className="list">
        {(links.data ?? []).map((link) => (
          <LinkRow key={link.id} link={link} />
        ))}
      </ul>
    </div>
  );
}

function LinkRow({ link }: { link: SitterLinkView }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { backend } = useServices();
  const { summaries } = usePets();
  const names = summaries.filter((c) => link.petIds.includes(c.pet.id)).map((c) => c.pet.profile.name);
  const url = linkOf(link.token);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast(strings.toast.copied);
    } catch {
      window.prompt(t.copy, url);
    }
  }

  async function share() {
    try {
      await navigator.share({ title: t.title, url });
    } catch {
      // Cancelled by the person, or not possible: nothing to do.
    }
  }

  async function revoke() {
    if (await confirm(t.revokeConfirm(link.label))) await backend.command('sitter.revoke', { linkId: link.id });
  }

  return (
    <li className="card stack">
      <div>
        <strong>{link.label}</strong> · {link.expired ? <span data-status="overdue">{t.expired}</span> : t.until(formatDate(link.expiresOn))}
        <br />
        <span className="muted">{[names.join(', '), t.by(link.byName)].filter(Boolean).join(' · ')}</span>
      </div>
      <div className="row wrap">
        {!link.expired && (
          <>
            <button type="button" className="secondary" onClick={() => void copy()}>
              {t.copy}
            </button>
            {typeof navigator.share === 'function' && (
              <button type="button" className="secondary" onClick={() => void share()}>
                {t.share}
              </button>
            )}
          </>
        )}
        <button type="button" className="secondary danger" onClick={() => void revoke()}>
          {t.revoke}
        </button>
      </div>
    </li>
  );
}

function SitterForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const { backend } = useServices();
  const { summaries } = usePets();
  const [label, setLabel] = useState('');
  const [petIds, setPetIds] = useState<string[]>(() => summaries.map((c) => c.pet.id));
  const [days, setDays] = useState(String(SITTER_DEFAULT_DAYS));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (petIds.length === 0) return setError(t.form.invalid);
    const result = await backend.command('sitter.create', { label, petIds, days: Number(days), note: note || null });
    if (result.ok) {
      toast(strings.toast.sitterCreated);
      onDone();
    } else setError(result.error === 'invalid' ? t.form.invalid : strings.genericError);
  }

  const toggle = (id: string) => setPetIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <form className="stack" onSubmit={submit}>
      <label>
        {t.form.label}
        <input required autoFocus maxLength={SITTER_LABEL_MAX} value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>
      <fieldset className="field">
        <legend>{t.form.pets}</legend>
        <div className="chips">
          {summaries.map(({ pet }) => (
            <button key={pet.id} type="button" className="chip" aria-pressed={petIds.includes(pet.id)} onClick={() => toggle(pet.id)}>
              {pet.profile.name}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        {t.form.days}
        <input required type="number" min={1} max={SITTER_MAX_DAYS} step={1} value={days} onChange={(e) => setDays(e.target.value)} />
      </label>
      <label>
        {t.form.note}
        <textarea rows={4} maxLength={SITTER_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button type="submit">{t.form.save}</button>
        <button type="button" className="secondary" onClick={onDone}>
          {strings.health.cancel}
        </button>
      </div>
    </form>
  );
}
