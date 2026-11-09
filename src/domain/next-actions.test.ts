import { describe, expect, it } from 'vitest';
import { petStatus, doneToday, pendingActions, type StatusPet } from './next-actions';

const utcDay = (at: Date) => at.toISOString().slice(0, 10);

describe('doneToday', () => {
  const day = '2026-11-04';
  const brasilia = (at: Date) => new Date(at.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

  it('is null without a record or when the record is from another day', () => {
    expect(doneToday(null, day, utcDay)).toBeNull();
    expect(doneToday({ byName: 'Cesar', what: 'Peso', at: '2026-11-03T23:00:00Z' }, day, utcDay)).toBeNull();
  });

  it('gives the first name of who registered today', () => {
    expect(doneToday({ byName: 'valéria souza', what: 'Antirrábica', at: '2026-11-04T09:00:00Z' }, day, utcDay)).toMatchObject({ by: 'Valéria', what: 'Antirrábica' });
    expect(doneToday({ byName: 'CESAR', what: 'Peso', at: '2026-11-04T09:00:00Z' }, day, utcDay)).toMatchObject({ by: 'Cesar', what: 'Peso' });
  });

  it('judges the day on the device clock, not in UTC', () => {
    // 01:00 UTC on the 5th is still 22h of the 4th in Brasília.
    expect(doneToday({ byName: 'Cesar', what: 'Peso', at: '2026-11-05T01:00:00Z' }, day, brasilia)).toMatchObject({ by: 'Cesar' });
    expect(doneToday({ byName: 'Cesar', what: 'Peso', at: '2026-11-05T01:00:00Z' }, day, utcDay)).toBeNull();
  });
});

const pet: StatusPet = { allergiesAnswered: true };
const today = '2026-11-04';

describe('petStatus', () => {
  it('is fine with no doses and the allergies answered', () => {
    expect(petStatus(pet, [], today)).toMatchObject({ needsAttention: false, vaccine: null, pending: [], next: null });
  });

  it('needs attention when the allergies are blank', () => {
    const status = petStatus({ allergiesAnswered: false }, [], today);
    expect(status).toMatchObject({ needsAttention: true, allergiesMissing: true, vaccine: null });
  });

  it('needs attention with a vaccine due within 30 days, and names the days left', () => {
    const status = petStatus(pet, [{ vaccine: 'V10', appliedOn: '2025-12-04', intervalDays: 365 }], today);
    expect(status).toMatchObject({ needsAttention: true, vaccine: { item: 'Vacina V10', overdue: false, days: 30 } });
  });

  it('lists every pending prazo, the earliest first', () => {
    const status = petStatus(
      pet,
      [
        { vaccine: 'V10', appliedOn: '2025-10-25', intervalDays: 365 },
        { vaccine: 'Antirrábica', appliedOn: '2025-10-20', intervalDays: 365 },
      ],
      today,
    );
    expect(status.vaccine).toEqual({ item: 'Vacina Antirrábica', overdue: true, days: 15 });
    expect(status.pending.map((p) => p.item)).toEqual(['Vacina Antirrábica', 'Vacina V10']);
  });

  it('keeps the next prazo even when it is far away, without demanding attention', () => {
    const status = petStatus(pet, [{ vaccine: 'V10', appliedOn: '2026-10-01', intervalDays: 365 }], today);
    expect(status.needsAttention).toBe(false);
    expect(status.next).toEqual({ item: 'Vacina V10', overdue: false, days: 331 });
  });

  it('needs attention when the weight alert fired, even with everything else in order', () => {
    const status = petStatus(pet, [], today, -12.5);
    expect(status).toMatchObject({ needsAttention: true, weightChange: { percent: -12.5 }, vaccine: null });
  });
});

describe('pendingActions', () => {
  const late = petStatus(pet, [{ vaccine: 'V10', appliedOn: '2025-10-25', intervalDays: 365 }], today); // 10 days late
  const soon = petStatus(pet, [{ vaccine: 'V5', appliedOn: '2025-11-10', intervalDays: 365 }], today); // 6 days left
  const weight = petStatus(pet, [], today, 6.2);
  const allergies = petStatus({ allergiesAnswered: false }, [], today);

  it('puts the late first, then the weight and allergies, then what is due', () => {
    const actions = pendingActions([
      { petId: 'soon', status: soon },
      { petId: 'weight', status: weight },
      { petId: 'late', status: late },
      { petId: 'allergies', status: allergies },
    ]);
    expect(actions.map((a) => `${a.petId}:${a.kind}`)).toEqual(['late:prazo', 'weight:weight', 'allergies:allergies', 'soon:prazo']);
  });

  it('gives one line per thing to do of the same pet', () => {
    const both = petStatus({ allergiesAnswered: false }, [{ vaccine: 'V10', appliedOn: '2025-10-25', intervalDays: 365 }], today, 8);
    expect(pendingActions([{ petId: 'p', status: both }]).map((a) => a.kind)).toEqual(['prazo', 'weight', 'allergies']);
  });

  it('leaves the snoozed pets out', () => {
    expect(pendingActions([{ petId: 'late', status: late }], new Set(['late']))).toEqual([]);
  });
});
