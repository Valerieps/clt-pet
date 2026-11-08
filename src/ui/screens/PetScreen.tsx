import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import type { MeView, PetUpdate, PetView } from '../../application/api-contract';
import { demandedDeadlines, type Deadline } from '../../domain/deadlines';
import { nameSize, dueLabel, PET_TABS, tabOfHash, type PetTab } from '../../domain/navigation';
import { daysBetween } from '../../domain/reminders/reminders';
import {
  ageParts,
  birthDateFromAge,
  formatAge,
  formatDate,
  MAX_TAGS,
  missingFields,
  PET_NAME_MAX,
  TAG_MAX,
  TEXT_MAX,
  type Allergy,
  type AllergyKind,
  type FoodKind,
  type Sex,
} from '../../domain/pets/pet';
import { ALERT_WINDOW_DAYS, formatKilos, latestWeight, weightAlert } from '../../domain/pets/weight';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { useConfirm } from '../confirm';
import { useToast } from '../toast';
import { todayLocal, useChefia, type Chefe } from '../chefia';
import { BackBar, CalendarIcon, CameraIcon, CatIcon, CheckIcon, DogIcon, Faces, MeLink, PencilIcon, StethoscopeIcon } from '../parts';
import { AgendamentosPanel } from './Agendamentos';
import { HealthPanel } from './Health';
import { Food } from './Routine';
import { PetPortrait } from '../PetPhoto';
import { shrinkToJpegBase64 } from '../photo';
import { Link, navigate, useHash, usePath } from '../router';
import { useQuery } from '../use-query';
import { WeightChart } from './WeightChart';

const t = strings.pets;
const mural = strings.mural;
const tabsT = strings.chefe.tabs;

/** A chefe's page (docs/spec/navegacao.md): the portrait in an arch under the aura, then what the chefe demands. */
export function PetScreen({ petId, me }: { petId: string; me: MeView }) {
  const { chefes, loading, failed } = useChefia();
  const chefe = chefes.find((c) => c.pet.id === petId);

  if (!chefe) {
    return (
      <>
        <header className="page-header">
          <BackBar to="/" label={strings.nav.backToMural} />
        </header>
        <main className="sheet">
          {failed && <p className="notice">{strings.genericError}</p>}
          {!loading && !failed && <p className="notice">{t.notFound}</p>}
        </main>
      </>
    );
  }
  return <PetPage chefe={chefe} chefes={chefes} me={me} />;
}

const NOT_EDITING: Record<PetTab, boolean> = { agendamentos: false, ficha: false, perfil: false };

function PetPage({ chefe, chefes, me }: { chefe: Chefe; chefes: readonly Chefe[]; me: MeView }) {
  const { pet, aura } = chefe;
  const name = pet.profile.name;
  const path = usePath();
  const hash = useHash();
  const [tab, setTab] = useState<PetTab | null>(null);
  // Each tab has its own pencil: editing one never turns on another.
  const [editing, setEditing] = useState(NOT_EDITING);
  const setTabEditing = (key: PetTab, value: boolean) => setEditing((all) => ({ ...all, [key]: value }));

  // Arriving at /chefes/<id>#vacinas (from a push, the Mural or an item) opens the tab that holds it.
  useEffect(() => {
    const key = window.location.hash.slice(1);
    const target = tabOfHash(key);
    if (!target) return;
    setTab(target);
    requestAnimationFrame(() => (document.getElementById(key) ?? document.getElementById('abas'))?.scrollIntoView());
  }, [path, hash]);

  const icons: Record<PetTab, ReactNode> = {
    agendamentos: <CalendarIcon />,
    ficha: <StethoscopeIcon />,
    perfil: pet.species === 'cat' ? <CatIcon /> : <DogIcon />,
  };

  return (
    <>
      <section className={`hero sunbg ${aura}`}>
        <div className="hero-top">
          <Faces chefes={chefes} current={pet.id} onDark />
          <MeLink me={me} />
        </div>
        <div className="arch">
          {pet.photoVersion ? (
            <PetPortrait pet={pet} />
          ) : (
            <span className="ph">
              <CameraIcon />
              {strings.chefe.noPortrait}
            </span>
          )}
        </div>
        <div className="hero-caption">
          <h1 className="monument" style={{ fontSize: nameSize(name) }}>
            {name}
          </h1>
          {pet.tags.length > 0 && <p className="meta">{pet.tags.join(' · ')}</p>}
          <p className="meta">{pet.tutorName ? t.tutor(pet.tutorName) : t.tutorPending(pet.tutorEmail)}</p>
        </div>
      </section>
      <main className="ground-sheet">
        <div id="abas" className="tabs" role="tablist">
          {PET_TABS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              className={`tab${tab === key ? ' on' : ''}`}
              aria-selected={tab === key}
              onClick={() => setTab(tab === key ? null : key)}
            >
              <span className="tab-icon">{icons[key]}</span>
              {tabsT[key]}
            </button>
          ))}
        </div>
        {tab && (
          <div id={tab} className="tab-panel" role="tabpanel" aria-label={tabsT[tab]}>
            <div className="spread">
              <h2>{tabsT[tab]}</h2>
              <EditToggle label={tabsT[tab]} editing={editing[tab]} onToggle={() => setTabEditing(tab, !editing[tab])} />
            </div>
            {tab === 'agendamentos' && <AgendamentosPanel chefe={chefe} editing={editing.agendamentos} />}
            {tab === 'ficha' && (
              <>
                <section id="peso" className="stack">
                  <h3>{strings.chefe.sections.weight}</h3>
                  <Weight pet={pet} removable={editing.ficha} />
                </section>
                <HealthPanel pet={pet} editing={editing.ficha} />
              </>
            )}
            {tab === 'perfil' && <ProfilePanel pet={pet} myId={me.id} editing={editing.perfil} onDone={() => setTabEditing('perfil', false)} />}
          </div>
        )}
        <Summary chefe={chefe} />
      </main>
    </>
  );
}

/** The section a deadline lives in, as a hash of the chefe's page. */
const HASH_OF_DEADLINE: Record<Deadline['kind'], string> = {
  vaccine: 'vacinas',
  parasite: 'medicacoes',
  hygiene: 'higiene',
  visit: 'consultas',
  return: 'consultas',
};

function deadlineLabel(d: Deadline): string {
  if (d.kind === 'return') return strings.chefe.deadline.return(d.name);
  if (d.kind === 'visit') return strings.chefe.deadline.visit(d.name);
  return d.name;
}

/** Under the tabs: what the chefe demands (Exige), from every deadline (docs/spec/navegacao.md). */
function Summary({ chefe }: { chefe: Chefe }) {
  const { pet, status, doses, care, plans } = chefe;
  const today = todayLocal();
  const visits = useQuery('visits', {}, ['visits', 'pets']);
  const demanded = demandedDeadlines({ doses, care, plans, visits: (visits.data ?? []).filter((v) => v.petId === pet.id) }, today);
  const alert = weightAlert(pet.weights, pet.weightAlertPercent);
  const days = (d: Deadline) => Math.abs(daysBetween(today, d.due));
  if (demanded.length === 0 && !alert && !status.allergiesMissing) return null;

  return (
    <div>
      <p className="lbl">{strings.chefe.requires}</p>
      {alert && (
        <Link to={`/chefes/${pet.id}#peso`} className="item">
          <span>
            <p>{strings.register.weight}</p>
            <span className="meta">{t.weight.alert(alert.percent, `${formatKilos(alert.fromGrams)} em ${formatDate(alert.fromDate)}`, `${formatKilos(alert.toGrams)} em ${formatDate(alert.toDate)}`)}</span>
          </span>
          <span className="when late">{strings.chefe.weightAlert}</span>
        </Link>
      )}
      {demanded.map((d) => (
        <Link key={`${d.kind}:${d.id}`} to={`/chefes/${pet.id}#${HASH_OF_DEADLINE[d.kind]}`} className="item">
          <span>
            <p>{deadlineLabel(d)}</p>
            <span className="meta">{formatDate(d.due)}</span>
          </span>
          <span className={`when${d.state === 'overdue' ? ' late' : ''}`}>{dueLabel(d.state === 'overdue', days(d))}</span>
        </Link>
      ))}
      {status.allergiesMissing && (
        <Link to={`/chefes/${pet.id}#perfil`} className="item">
          <p>{t.allergiesTitle}</p>
          <span className="when">{mural.allergiesPill}</span>
        </Link>
      )}
    </div>
  );
}

/** "04/11/2023 · 3 anos", or "cerca de 3 anos (estimado)" when only the age was known. */
function birthText(birthDate: string, estimated: boolean): string {
  const age = formatAge(birthDate, todayLocal());
  return estimated ? t.profile.ageEstimated(age) : `${formatDate(birthDate)} · ${t.profile.age(age)}`;
}

/** The pencil beside a tab's title: it turns on editing for the whole tab; while editing it turns into a check. */
function EditToggle({ label, editing, onToggle }: { label: string; editing: boolean; onToggle: () => void }) {
  const text = editing ? strings.chefe.doneEditing : strings.chefe.editTab(label);
  return (
    <button type="button" className="icon-btn" aria-label={text} title={text} aria-pressed={editing} onClick={onToggle}>
      {editing ? <CheckIcon /> : <PencilIcon />}
    </button>
  );
}

/** Data, allergies, Alimentação and Tutoria. The tab's pencil opens the profile form, the photo, the tags and the retirement. */
function ProfilePanel({ pet, myId, editing, onDone }: { pet: PetView; myId: string; editing: boolean; onDone: () => void }) {
  const missing = missingFields(pet.profile, pet.allergiesAnswered);

  return (
    <>
      <div className="stack">
        {missing.length > 0 && (
          <p className="notice">
            {t.missingTitle} {missing.map((m) => t.missing[m]).join(', ')}.
          </p>
        )}
        {editing ? (
          <>
            <PhotoControls pet={pet} />
            <Tags pet={pet} />
            <ProfileForm pet={pet} onDone={onDone} />
            <Retire pet={pet} />
          </>
        ) : (
          <ProfileSummary pet={pet} />
        )}
      </div>
      <Food pet={pet} removable={editing} />
      <section id="tutoria" className="stack">
        <h3>{strings.chefe.sections.tutoria}</h3>
        <Tutoria pet={pet} myId={myId} />
      </section>
    </>
  );
}

function PhotoControls({ pet }: { pet: PetView }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { backend } = useServices();
  const [error, setError] = useState<string | null>(null);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the same file be chosen again
    if (!file) return;
    const image = await shrinkToJpegBase64(file);
    if (!image) return setError(t.photo.invalid);
    const result = await backend.command('pet.setPhoto', { petId: pet.id, image });
    if (result.ok) toast(strings.toast.photo(pet.profile.name));
    setError(result.ok ? null : result.error === 'invalid' ? t.photo.invalid : strings.genericError);
  }

  async function remove() {
    if (!(await confirm(t.photo.removeConfirm))) return;
    const result = await backend.command('pet.setPhoto', { petId: pet.id, image: null });
    if (result.ok) toast(strings.toast.photoRemoved(pet.profile.name));
    setError(result.ok ? null : strings.genericError);
  }

  return (
    <>
      <div className="row wrap">
        <label className="button secondary">
          {pet.photoVersion ? t.photo.change : t.photo.add}
          <input type="file" accept="image/*" hidden onChange={(e) => void choose(e)} />
        </label>
        {pet.photoVersion && (
          <button type="button" className="secondary danger" onClick={() => void remove()}>
            {t.photo.remove}
          </button>
        )}
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function Tags({ pet }: { pet: PetView }) {
  const toast = useToast();
  const { backend } = useServices();
  const [draft, setDraft] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    const result = await backend.command('pet.setTags', { petId: pet.id, tags: draft ?? [] });
    if (result.ok) {
      toast(strings.toast.tags(pet.profile.name));
      setDraft(null);
      setError(null);
    } else {
      setError(result.error === 'invalid' ? t.tags.invalid(MAX_TAGS) : strings.genericError);
    }
  }

  if (!draft) {
    return (
      <>
        {pet.tags.length === 0 ? (
          <p className="muted">{t.tags.empty}</p>
        ) : (
          <ul className="tags">
            {pet.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
        <button type="button" className="secondary" onClick={() => setDraft([...pet.tags])}>
          {t.tags.edit}
        </button>
      </>
    );
  }

  const setTag = (index: number, value: string) => setDraft((list) => (list ?? []).map((tag, i) => (i === index ? value : tag)));
  return (
    <form className="stack" onSubmit={save}>
      <h2>{t.tags.title}</h2>
      {draft.map((tag, index) => (
        <div key={index} className="row wrap">
          <input className="grow" aria-label={t.tags.label} maxLength={TAG_MAX} value={tag} onChange={(e) => setTag(index, e.target.value)} />
          <button type="button" className="secondary danger" onClick={() => setDraft((list) => (list ?? []).filter((_, i) => i !== index))}>
            {t.tags.remove}
          </button>
        </div>
      ))}
      {draft.length < MAX_TAGS && (
        <div>
          <button type="button" className="secondary" onClick={() => setDraft((list) => [...(list ?? []), ''])}>
            {t.tags.add}
          </button>
        </div>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button type="submit">{t.tags.save}</button>
        <button type="button" className="secondary" onClick={() => setDraft(null)}>
          {t.tags.cancel}
        </button>
      </div>
    </form>
  );
}

function ProfileSummary({ pet }: { pet: PetView }) {
  const { profile } = pet;
  const allergies = !pet.allergiesAnswered
    ? null
    : profile.allergies.length === 0
      ? t.noAllergies
      : profile.allergies.map((a) => strings.sos.allergy(t.allergyKind[a.kind], a.description)).join('; ');
  const rows: [string, string | null][] = [
    [t.profile.breed, profile.breed],
    [t.profile.birthDate, profile.birthDate ? birthText(profile.birthDate, profile.birthEstimated) : null],
    [t.profile.sex, profile.sex ? t.profile.sexOptions[profile.sex] : null],
    [t.profile.neutered, profile.neutered === null ? null : profile.neutered ? t.profile.neuteredOptions.yes : t.profile.neuteredOptions.no],
    [t.profile.microchip, profile.microchip],
    [strings.chefe.sections.allergies, allergies],
  ];
  return (
    <>
      <p className="muted">{t.species[pet.species]}</p>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="muted">{label}</dt>
            <dd>{value ?? t.profile.notInformed}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function ProfileForm({ pet, onDone }: { pet: PetView; onDone: () => void }) {
  const toast = useToast();
  const { backend } = useServices();
  const { profile } = pet;
  const [name, setName] = useState(profile.name);
  const [breed, setBreed] = useState(profile.breed ?? '');
  const [birthDate, setBirthDate] = useState(profile.birthEstimated ? '' : (profile.birthDate ?? ''));
  const [byAge, setByAge] = useState(profile.birthEstimated);
  const initialAge = profile.birthEstimated && profile.birthDate ? ageParts(profile.birthDate, todayLocal()) : null;
  const [years, setYears] = useState(initialAge ? String(initialAge.years) : '');
  const [months, setMonths] = useState(initialAge ? String(initialAge.months) : '');
  const [sex, setSex] = useState<Sex | ''>(profile.sex ?? '');
  const [neutered, setNeutered] = useState(profile.neutered === null ? '' : profile.neutered ? 'yes' : 'no');
  const [microchip, setMicrochip] = useState(profile.microchip ?? '');
  const [foodKind, setFoodKind] = useState<FoodKind | ''>(profile.foodKind ?? '');
  const [foodBrand, setFoodBrand] = useState(profile.foodBrand ?? '');
  const [foodDaily, setFoodDaily] = useState(profile.foodDaily ?? '');
  const [allergies, setAllergies] = useState<Allergy[]>([...profile.allergies]);
  const [percent, setPercent] = useState(String(pet.weightAlertPercent));
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const estimated = byAge ? birthDateFromAge(Number(years || 0), Number(months || 0), todayLocal()) : null;
    if (byAge && (years || months) && !estimated) return setError(t.profile.invalid);
    const update: PetUpdate = {
      petId: pet.id,
      name,
      breed: breed || null,
      birthDate: byAge ? estimated : birthDate || null,
      birthEstimated: byAge && estimated !== null,
      sex: sex || null,
      neutered: neutered === '' ? null : neutered === 'yes',
      microchip: microchip || null,
      foodKind: foodKind || null,
      foodBrand: foodBrand || null,
      foodDaily: foodDaily || null,
      allergies,
      weightAlertPercent: Number(percent),
    };
    const result = await backend.command('pet.update', update);
    if (result.ok) {
      toast(strings.toast.profile(pet.profile.name));
      onDone();
    } else setError(result.error === 'invalid' ? t.profile.invalid : strings.genericError);
  }

  const setAllergy = (index: number, patch: Partial<Allergy>) =>
    setAllergies((list) => list.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  return (
    <form className="stack" onSubmit={submit}>
      <h2>{t.profile.title}</h2>
      <label>
        {t.profile.name}
        <input required maxLength={PET_NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        {t.profile.breed}
        <input maxLength={TEXT_MAX} value={breed} onChange={(e) => setBreed(e.target.value)} />
      </label>
      <label>
        {t.profile.birthDate}
        <select value={byAge ? 'age' : 'date'} onChange={(e) => setByAge(e.target.value === 'age')}>
          <option value="date">{t.profile.birthKnown}</option>
          <option value="age">{t.profile.birthEstimated}</option>
        </select>
      </label>
      {byAge ? (
        <div className="row wrap">
          <label>
            {t.profile.ageYears}
            <input type="number" min={0} max={40} step={1} value={years} onChange={(e) => setYears(e.target.value)} />
          </label>
          <label>
            {t.profile.ageMonths}
            <input type="number" min={0} max={11} step={1} value={months} onChange={(e) => setMonths(e.target.value)} />
          </label>
        </div>
      ) : (
        <input type="date" aria-label={t.profile.birthDate} max={todayLocal()} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      )}
      <label>
        {t.profile.sex}
        <select value={sex} onChange={(e) => setSex(e.target.value as Sex | '')}>
          <option value="" />
          <option value="female">{t.profile.sexOptions.female}</option>
          <option value="male">{t.profile.sexOptions.male}</option>
        </select>
      </label>
      <label>
        {t.profile.neutered}
        <select value={neutered} onChange={(e) => setNeutered(e.target.value)}>
          <option value="" />
          <option value="yes">{t.profile.neuteredOptions.yes}</option>
          <option value="no">{t.profile.neuteredOptions.no}</option>
        </select>
      </label>
      <label>
        {t.profile.microchip}
        <input maxLength={30} value={microchip} onChange={(e) => setMicrochip(e.target.value)} />
      </label>
      <label>
        {t.profile.foodKind}
        <select value={foodKind} onChange={(e) => setFoodKind(e.target.value as FoodKind | '')}>
          <option value="" />
          <option value="dry">{t.profile.foodKindOptions.dry}</option>
          <option value="wet">{t.profile.foodKindOptions.wet}</option>
        </select>
      </label>
      <label>
        {t.profile.foodBrand}
        <input maxLength={TEXT_MAX} value={foodBrand} onChange={(e) => setFoodBrand(e.target.value)} />
      </label>
      <label>
        {t.profile.foodDaily}
        <input maxLength={TEXT_MAX} value={foodDaily} onChange={(e) => setFoodDaily(e.target.value)} />
      </label>

      <h2>{t.allergiesTitle}</h2>
      {allergies.map((allergy, index) => (
        <div key={index} className="row wrap">
          <select
            aria-label={t.allergiesTitle}
            value={allergy.kind}
            onChange={(e) => setAllergy(index, { kind: e.target.value as AllergyKind })}
          >
            <option value="drug">{t.allergyKind.drug}</option>
            <option value="food">{t.allergyKind.food}</option>
          </select>
          <input
            className="grow"
            aria-label={t.profile.allergyDescription}
            placeholder={t.profile.allergyDescription}
            maxLength={TEXT_MAX}
            value={allergy.description}
            onChange={(e) => setAllergy(index, { description: e.target.value })}
          />
          <button type="button" className="secondary danger" onClick={() => setAllergies((list) => list.filter((_, i) => i !== index))}>
            {t.profile.removeAllergy}
          </button>
        </div>
      ))}
      <div>
        <button type="button" className="secondary" onClick={() => setAllergies((list) => [...list, { kind: 'drug', description: '' }])}>
          {t.profile.addAllergy}
        </button>
      </div>

      <label>
        {t.profile.alertPercent}
        <input type="number" min={1} max={50} step={1} required value={percent} onChange={(e) => setPercent(e.target.value)} />
      </label>

      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button type="submit">{t.profile.save}</button>
        <button type="button" className="secondary" onClick={onDone}>
          {t.profile.cancel}
        </button>
      </div>
    </form>
  );
}

function Tutoria({ pet, myId }: { pet: PetView; myId: string }) {
  const { backend } = useServices();
  const members = useQuery('members', {}, ['members']);
  const [choice, setChoice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const others = members.data?.filter((m) => m.id !== pet.tutorMemberId) ?? [];

  async function change(event: FormEvent) {
    event.preventDefault();
    if (!choice) return;
    const result = await backend.command('pet.setTutor', { petId: pet.id, memberId: choice });
    setError(result.ok ? null : strings.genericError);
    if (result.ok) setChoice('');
  }

  return (
    <>
      <p>{pet.tutorName ? t.tutor(pet.tutorName) : t.tutorPending(pet.tutorEmail)}</p>
      {pet.tutorUntil && <p className="notice">{t.tutoria.lent(formatDate(pet.tutorUntil), pet.tutorReturnName)}</p>}
      <p className="muted">{t.tutoria.reserve}</p>
      {others.length > 0 && (
        <form className="row wrap" onSubmit={change}>
          <select aria-label={t.tutoria.change} value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">{t.tutoria.change}</option>
            {others.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.id === myId ? ` ${strings.members.you}` : ''}
              </option>
            ))}
          </select>
          <button type="submit" className="secondary" disabled={!choice}>
            {t.tutoria.confirm}
          </button>
        </form>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {others.length > 0 && <LendTutoria pet={pet} candidates={others} myId={myId} />}
    </>
  );
}

/** Passes the tutoria for a period; it comes back on its own on the chosen day (docs/spec/chefes.md). */
function LendTutoria({ pet, candidates, myId }: { pet: PetView; candidates: readonly { id: string; name: string }[]; myId: string }) {
  const { backend } = useServices();
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState(candidates[0]?.id ?? '');
  const [until, setUntil] = useState('');
  const [error, setError] = useState<string | null>(null);
  const tomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString('sv-SE');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await backend.command('pet.lendTutoria', { petId: pet.id, memberId, until });
    if (result.ok) {
      setOpen(false);
      setError(null);
    } else setError(result.error === 'invalid' ? t.tutoria.lendInvalid : strings.genericError);
  }

  if (!open) {
    return (
      <div>
        <button type="button" className="secondary" onClick={() => setOpen(true)}>
          {t.tutoria.lend}
        </button>
      </div>
    );
  }
  return (
    <form className="stack" onSubmit={submit}>
      <label>
        {t.tutoria.lendTo}
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {candidates.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.id === myId ? ` ${strings.members.you}` : ''}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t.tutoria.lendUntil}
        <input required type="date" min={tomorrow} value={until} onChange={(e) => setUntil(e.target.value)} />
      </label>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button type="submit">{t.tutoria.lendConfirm}</button>
        <button type="button" className="secondary" onClick={() => setOpen(false)}>
          {t.profile.cancel}
        </button>
      </div>
    </form>
  );
}

/** Aposentadoria: the chefe leaves the Mural; the history stays. */
function Retire({ pet }: { pet: PetView }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { backend } = useServices();
  const [error, setError] = useState<string | null>(null);

  async function retire() {
    if (!(await confirm(t.retire.confirm(pet.profile.name)))) return;
    const result = await backend.command('pet.retire', { petId: pet.id });
    if (result.ok) {
      toast(t.retire.done(pet.profile.name));
      navigate('/', { replace: true });
    } else setError(strings.genericError);
  }

  return (
    <div className="stack">
      <p className="muted">{t.retire.explain}</p>
      <div>
        <button type="button" className="secondary danger" onClick={() => void retire()}>
          {t.retire.button}
        </button>
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Peso, first in the Ficha Médica tab: the current weight, the alert and the chart; every weighing folded below. */
function Weight({ pet, removable }: { pet: PetView; removable: boolean }) {
  const confirm = useConfirm();
  const { backend } = useServices();
  const [error, setError] = useState<string | null>(null);
  const latest = latestWeight(pet.weights);
  const alert = weightAlert(pet.weights, pet.weightAlertPercent);

  async function remove(weightId: string) {
    if (!(await confirm(t.weight.removeConfirm))) return;
    const result = await backend.command('weight.remove', { weightId });
    setError(result.ok ? null : strings.genericError);
  }

  return (
    <>
      <p>{latest ? t.currentWeight(formatKilos(latest.grams)) : t.noWeight}</p>
      {alert && (
        <p className="notice" role="status">
          {t.weight.alert(alert.percent, `${formatKilos(alert.fromGrams)} em ${formatDate(alert.fromDate)}`, `${formatKilos(alert.toGrams)} em ${formatDate(alert.toDate)}`)}
        </p>
      )}
      <WeightChart points={pet.weights} label={t.weight.chart(pet.profile.name)} />
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {pet.weights.length > 0 && (
        <details className="fold" open={removable || undefined}>
          <summary>{strings.chefe.history}</summary>
          <ul className="list">
            {[...pet.weights].reverse().map((w) => (
              <li key={w.id} className="card row">
                <span className="grow">
                  {formatKilos(w.grams)} · {formatDate(w.onDate)} <span className="muted">{t.weight.by(w.byName)}</span>
                </span>
                {removable && (
                  <button type="button" className="secondary danger" onClick={() => void remove(w.id)}>
                    {t.weight.remove}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="muted">{t.weight.limit(pet.weightAlertPercent, ALERT_WINDOW_DAYS)}</p>
    </>
  );
}
