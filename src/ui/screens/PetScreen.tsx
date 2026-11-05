import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { MeView, PetUpdate, PetView } from '../../application/api-contract';
import { nameSize, dueLabel } from '../../domain/navigation';
import { daysBetween } from '../../domain/reminders/reminders';
import { boosterDate, currentDoses, vaccineStatus } from '../../domain/vaccines/vaccine';
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
import { BackBar, CameraIcon, Faces, MeLink } from '../parts';
import { PetPortrait } from '../PetPhoto';
import { shrinkToJpegBase64 } from '../photo';
import { Link, usePath } from '../router';
import { useQuery } from '../use-query';
import { Vaccines } from './Vaccines';
import { WeightChart } from './WeightChart';

const t = strings.pets;
const mural = strings.mural;
const vaccinesT = strings.vaccines;

/** A chefe's page (docs/spec/navegacao.md): the portrait in an arch under the aura, then what the chefe demands. */
export function PetScreen({ petId, me }: { petId: string; me: MeView }) {
  const { chefes, loading, failed } = useChefia();
  const chefe = chefes.find((c) => c.pet.id === petId);
  const path = usePath();

  // Arriving at /chefes/<id>#vacinas (from the Registrar drawer) scrolls to that part of the page.
  const found = chefe !== undefined;
  useEffect(() => {
    if (!found) return;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [found, path]);

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

function PetPage({ chefe, chefes, me }: { chefe: Chefe; chefes: readonly Chefe[]; me: MeView }) {
  const { pet, aura } = chefe;
  const name = pet.profile.name;
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
        <h1 className="monument" style={{ fontSize: nameSize(name) }}>
          {name}
        </h1>
      </section>
      <main className="ground-sheet">
        <div className="actions">
          <Link to={`/chefes/${pet.id}/registrar`} className="btn">
            {strings.register.button}
          </Link>
          <Link to={`/chefes/${pet.id}#historico`} className="btn line">
            {strings.register.history}
          </Link>
        </div>
        <Summary chefe={chefe} />
        <div id="historico">
          <PetDetails pet={pet} myId={me.id} />
        </div>
      </main>
    </>
  );
}

/** Under the name: tags, allergies, and what the chefe demands (Exige) and what is next (A seguir). */
function Summary({ chefe }: { chefe: Chefe }) {
  const { pet, status, doses } = chefe;
  const today = todayLocal();
  const { profile } = pet;
  const current = currentDoses(doses).map((dose) => ({ dose, state: vaccineStatus(dose, today), due: boosterDate(dose) }));
  const demanded = current.filter((c) => c.state !== 'ok').sort((a, b) => a.due.localeCompare(b.due));
  const next = current.filter((c) => c.state === 'ok').sort((a, b) => a.due.localeCompare(b.due)).slice(0, 2);
  const alert = weightAlert(pet.weights, pet.weightAlertPercent);
  const nothingDemanded = demanded.length === 0 && !alert && !status.allergiesMissing;

  return (
    <>
      {pet.tags.length > 0 && <p className="meta">{pet.tags.join(' · ')}</p>}
      <p className="meta">{pet.tutorName ? t.tutor(pet.tutorName) : t.tutorPending(pet.tutorEmail)}</p>
      {profile.allergies.length > 0 ? (
        <div className="allergy" role="region" aria-label={t.allergiesTitle}>
          {profile.allergies.map((a, i) => (
            <p key={i}>
              {t.allergyKind[a.kind]}: {a.description}
            </p>
          ))}
        </div>
      ) : (
        <p className="meta">{pet.allergiesAnswered ? t.noAllergies : mural.allergiesMissing}</p>
      )}
      {nothingDemanded && <div className="calm-note">{strings.chefe.allGood}</div>}
      {!nothingDemanded && (
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
          {demanded.map(({ dose, state, due }) => (
            <Link key={dose.id} to={`/chefes/${pet.id}#vacinas`} className="item">
              <span>
                <p>{dose.vaccine}</p>
                <span className="meta">{formatDate(due)}</span>
              </span>
              <span className={`when${state === 'overdue' ? ' late' : ''}`}>{dueLabel(state === 'overdue', Math.abs(daysBetween(today, due)))}</span>
            </Link>
          ))}
          {status.allergiesMissing && (
            <Link to={`/chefes/${pet.id}#historico`} className="item">
              <p>{t.allergiesTitle}</p>
              <span className="when">{mural.allergiesPill}</span>
            </Link>
          )}
        </div>
      )}
      {next.length > 0 && (
        <div>
          <p className="lbl">{strings.chefe.next}</p>
          {next.map(({ dose, due }) => (
            <Link key={dose.id} to={`/chefes/${pet.id}#vacinas`} className="item">
              <span>
                <p>{dose.vaccine}</p>
                <span className="meta">{strings.chefe.dueOn(formatDate(due))}</span>
              </span>
              <span className="when ok">{vaccinesT.status.ok}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

/** "04/11/2023 · 3 anos", or "cerca de 3 anos (estimado)" when only the age was known. */
function birthText(birthDate: string, estimated: boolean): string {
  const age = formatAge(birthDate, todayLocal());
  return estimated ? t.profile.ageEstimated(age) : `${formatDate(birthDate)} · ${t.profile.age(age)}`;
}

function PetDetails({ pet, myId }: { pet: PetView; myId: string }) {
  const [editing, setEditing] = useState(false);
  const { profile } = pet;
  const missing = missingFields(profile, pet.allergiesAnswered);

  return (
    <>
      <PhotoControls pet={pet} />
      <Tags pet={pet} />

      {missing.length > 0 && (
        <p className="notice">
          {t.missingTitle} {missing.map((m) => t.missing[m]).join(', ')}.
        </p>
      )}

      {editing ? <ProfileForm pet={pet} onDone={() => setEditing(false)} /> : <ProfileSummary pet={pet} onEdit={() => setEditing(true)} />}
      <Tutoria pet={pet} myId={myId} />
      <div id="peso">
        <Weight pet={pet} />
      </div>
      <div id="vacinas">
        <Vaccines pet={pet} />
      </div>
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

function ProfileSummary({ pet, onEdit }: { pet: PetView; onEdit: () => void }) {
  const { profile } = pet;
  const rows: [string, string | null][] = [
    [t.profile.breed, profile.breed],
    [t.profile.birthDate, profile.birthDate ? birthText(profile.birthDate, profile.birthEstimated) : null],
    [t.profile.sex, profile.sex ? t.profile.sexOptions[profile.sex] : null],
    [t.profile.neutered, profile.neutered === null ? null : profile.neutered ? t.profile.neuteredOptions.yes : t.profile.neuteredOptions.no],
    [t.profile.microchip, profile.microchip],
    [
      t.profile.foodKind,
      profile.foodKind ? [t.profile.foodKindOptions[profile.foodKind], profile.foodBrand, profile.foodDaily].filter(Boolean).join(' · ') : null,
    ],
  ];
  return (
    <>
      <h2>{t.profile.title}</h2>
      <p className="muted">{t.species[pet.species]}</p>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="muted">{label}</dt>
            <dd>{value ?? t.profile.notInformed}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="secondary" onClick={onEdit}>
        {t.profile.edit}
      </button>
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
      <h2>{t.tutoria.title}</h2>
      <p>{pet.tutorName ? t.tutor(pet.tutorName) : t.tutorPending(pet.tutorEmail)}</p>
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
    </>
  );
}

function Weight({ pet }: { pet: PetView }) {
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
      <h2>{t.weight.title}</h2>
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
      <ul className="list">
        {[...pet.weights].reverse().map((w) => (
          <li key={w.id} className="card row">
            <span className="grow">
              {formatKilos(w.grams)} · {formatDate(w.onDate)} <span className="muted">{t.weight.by(w.byName)}</span>
            </span>
            <button type="button" className="secondary danger" onClick={() => void remove(w.id)}>
              {t.weight.remove}
            </button>
          </li>
        ))}
      </ul>
      <p className="muted">{t.weight.limit(pet.weightAlertPercent, ALERT_WINDOW_DAYS)}</p>
    </>
  );
}
