// Plans the reminders that are due (docs/spec/lembretes.md, docs/ARQUITETURA.md "Fluxo de eventos").
// It records each stage in `reminders_sent` and returns the pushes to send; the Durable Object
// sends them after the transaction, so a stage is never recorded twice and never sent twice.
import { brasiliaTime, daysFor, dueStages } from '../../src/domain/reminders/reminders';
import { fillPhrase, pickTemplate, toneFor } from '../../src/domain/voice/voice';
import { nowIso, type Context } from './context';
import { devicesOf } from './push';

/** Something with a due date that deserves a reminder, e.g. a vaccine's next dose. */
export interface DueItem {
  readonly petId: string;
  /** What the notice names: "Vacina V10". */
  readonly item: string;
  /** YYYY-MM-DD. */
  readonly dueOn: string;
  /** The tab of the pet's page the notification opens (docs/spec/navegacao.md): "vacinas", "cuidados", "saude". */
  readonly tab: string;
}

/** Where due items come from. Each feature that has due dates (vaccines first) adds one. */
export type ReminderSource = (ctx: Context) => DueItem[];

/** One notification for one device. The payload is JSON the service worker shows. */
export interface PushMessage {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
  readonly payload: string;
}

export interface PushPayload {
  readonly title: string;
  readonly body: string;
  /** The page the notification opens. */
  readonly url: string;
  /** A notification with the same tag replaces the earlier one. */
  readonly tag: string;
}

interface PetRow {
  id: string;
  name: string;
  serious_mode: number;
  tutor_member_id: string | null;
  tutor_name: string | null;
}

interface MemberRow {
  id: string;
  name: string;
}

export function planReminders(ctx: Context, sources: readonly ReminderSource[], random: () => number = Math.random): PushMessage[] {
  const now = ctx.clock.now();
  const messages: PushMessage[] = [];
  const members = ctx.sql.all<MemberRow>('SELECT id, name FROM members WHERE active = 1');

  for (const source of sources) {
    for (const due of source(ctx)) {
      const [pet] = ctx.sql.all<PetRow>(
        `SELECT pets.id, pets.name, pets.serious_mode, pets.tutor_member_id, tutor.name AS tutor_name
         FROM pets LEFT JOIN members AS tutor ON tutor.id = pets.tutor_member_id AND tutor.active = 1
         WHERE pets.id = ? AND pets.retired_at IS NULL`,
        due.petId,
      );
      if (!pet) continue;
      const responsible = pet.tutor_name === null ? null : pet.tutor_member_id;

      for (const stage of dueStages(due.dueOn, now)) {
        const alreadySent = ctx.sql.all(
          'SELECT 1 FROM reminders_sent WHERE pet_id = ? AND item = ? AND due_on = ? AND stage = ?',
          pet.id,
          due.item,
          due.dueOn,
          stage,
        );
        if (alreadySent.length > 0) continue;

        const recipients =
          stage === 'escalated' ? members.filter((member) => member.id !== responsible) : members.filter((member) => member.id === responsible);
        // Nobody to tell yet (the tutor has not signed in): leave the stage open for a later tick.
        if (recipients.length === 0) continue;

        ctx.sql.run(
          'INSERT INTO reminders_sent (pet_id, item, due_on, stage, sent_at) VALUES (?, ?, ?, ?, ?)',
          pet.id,
          due.item,
          due.dueOn,
          stage,
          nowIso(ctx),
        );

        const late = due.dueOn < brasiliaTime(now).date;
        const tone = toneFor({ context: 'reminder', seriousMode: pet.serious_mode === 1, graveCondition: false });
        const template = pickTemplate({ petId: pet.id, event: late ? 'overdue' : 'dueSoon', tone, random });

        for (const recipient of recipients) {
          const body = `${fillPhrase(template, {
            nome: pet.name,
            item: due.item,
            dias: daysFor(due.dueOn, now),
            funcionario: recipient.name,
          })}${stage === 'escalated' && pet.tutor_name ? ` Responsável: ${pet.tutor_name}.` : ''}`;
          const payload: PushPayload = { title: pet.name, body, url: `/pets/${pet.id}#${due.tab}`, tag: `${pet.id}:${due.item}:${due.dueOn}` };
          for (const device of devicesOf(ctx, recipient.id)) messages.push({ ...device, payload: JSON.stringify(payload) });
        }
      }
    }
  }
  return messages;
}
