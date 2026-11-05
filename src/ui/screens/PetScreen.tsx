import { useState, type FormEvent } from 'react';
import type { PetUpdate, PetView } from '../../application/api-contract';
import { formatDate, missingFields, PET_NAME_MAX, TEXT_MAX, type Allergy, type AllergyKind, type FoodKind, type Sex } from '../../domain/pets/pet';
import { ALERT_WINDOW_DAYS, formatKilos, latestWeight, parseKilos, weightAlert } from '../../domain/pets/weight';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Link } from '../router';
import { useQuery } from '../use-query';
import { Vaccines } from './Vaccines';
import { WeightChart } from './WeightChart';

const t = strings.pets;
const todayLocal = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in the device's time zone

export function PetScreen({ petId, myId }: { petId: string; myId: string }) {
  const pets = useQuery('pets', {}, ['pets', 'members']);
  const pet = pets.data?.find((p) => p.id === petId);

  return (
    <section>
      <p>
        <Link to="/chefes">{t.back}</Link>
      </p>
      {pets.error && !pets.data && <p className="notice">{strings.genericError}</p>}
      {pets.data && !pet && <p className="notice">{t.notFound}</p>}
      {pet && <PetDetails pet={pet} myId={myId} allPets={pets.data ?? []} />}
    </section>
  );
}

function PetDetails({ pet, myId, allPets }: { pet: PetView; myId: string; allPets: readonly PetView[] }) {
  const [editing, setEditing] = useState(false);
  const { profile } = pet;
  const missing = missingFields(profile, pet.allergiesAnswered);

  return (
    <>
      <h1>{profile.name}</h1>
      <ul className="tags">
        {pet.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>

      <div className="allergy" role="region" aria-label={t.allergiesTitle}>
        <h2>{t.allergiesTitle}</h2>
        {profile.allergies.length === 0 ? (
          <p>{t.noAllergies}</p>
        ) : (
          <ul>
            {profile.allergies.map((a, i) => (
              <li key={i}>
                {t.allergyKind[a.kind]}: {a.description}
              </li>
            ))}
          </ul>
        )}
      </div>

      {missing.length > 0 && (
        <p className="notice">
          {t.missingTitle} {missing.map((m) => t.missing[m]).join(', ')}.
        </p>
      )}

      {editing ? <ProfileForm pet={pet} onDone={() => setEditing(false)} /> : <ProfileSummary pet={pet} onEdit={() => setEditing(true)} />}
      <Tutoria pet={pet} myId={myId} />
      <Weight pet={pet} />
      <Vaccines pet={pet} allPets={allPets} />
    </>
  );
}

function ProfileSummary({ pet, onEdit }: { pet: PetView; onEdit: () => void }) {
  const { profile } = pet;
  const rows: [string, string | null][] = [
    [t.profile.breed, profile.breed],
    [t.profile.birthDate, profile.birthDate ? formatDate(profile.birthDate) : null],
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
  const { backend } = useServices();
  const { profile } = pet;
  const [name, setName] = useState(profile.name);
  const [breed, setBreed] = useState(profile.breed ?? '');
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? '');
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
    const update: PetUpdate = {
      petId: pet.id,
      name,
      breed: breed || null,
      birthDate: birthDate || null,
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
    if (result.ok) onDone();
    else setError(result.error === 'invalid' ? t.profile.invalid : strings.genericError);
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
        <input type="date" max={todayLocal()} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      </label>
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
  const { backend } = useServices();
  const [kilos, setKilos] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [error, setError] = useState<string | null>(null);
  const latest = latestWeight(pet.weights);
  const alert = weightAlert(pet.weights, pet.weightAlertPercent);

  async function add(event: FormEvent) {
    event.preventDefault();
    const grams = parseKilos(kilos);
    if (grams === null) return setError(t.weight.invalid);
    const result = await backend.command('weight.add', { petId: pet.id, grams, onDate: date });
    if (result.ok) {
      setKilos('');
      setError(null);
    } else {
      setError(result.error === 'invalid' ? t.weight.invalid : strings.genericError);
    }
  }

  async function remove(weightId: string) {
    if (!window.confirm(t.weight.removeConfirm)) return;
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
      <form className="row wrap" onSubmit={add}>
        <label>
          {t.weight.kilos}
          <input required inputMode="decimal" value={kilos} onChange={(e) => setKilos(e.target.value)} />
        </label>
        <label>
          {t.weight.date}
          <input required type="date" max={todayLocal()} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button type="submit">{t.weight.add}</button>
      </form>
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
