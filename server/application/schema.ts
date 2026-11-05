// The group's database (docs/ARQUITETURA.md). Migrations run in order, once each, when the
// Durable Object starts. Never edit a migration that has shipped: add the next one.
import type { Sql } from './ports';

export const MIGRATIONS: readonly (readonly string[])[] = [
  // 1: members, their sessions and the invites.
  [
    `CREATE TABLE members (
      id TEXT PRIMARY KEY,
      google_sub TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      photo_url TEXT,
      roles TEXT NOT NULL DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1,
      joined_at TEXT NOT NULL,
      removed_at TEXT
    )`,
    `CREATE TABLE sessions (
      token_hash TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`,
    `CREATE INDEX sessions_member ON sessions(member_id)`,
    `CREATE TABLE invites (
      email TEXT PRIMARY KEY,
      invited_by TEXT NOT NULL REFERENCES members(id),
      state TEXT NOT NULL,
      created_at TEXT NOT NULL,
      accepted_at TEXT,
      revoked_at TEXT
    )`,
  ],
  // 2: the chefes, their tags, allergies and weights, and the three that start registered
  // (docs/spec/chefes.md). The tutor is tied by e-mail; sign-in fills `tutor_member_id`.
  [
    `CREATE TABLE pets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      breed TEXT,
      birth_date TEXT,
      sex TEXT,
      neutered INTEGER,
      microchip TEXT,
      food_kind TEXT,
      food_brand TEXT,
      food_daily TEXT,
      allergies_answered INTEGER NOT NULL DEFAULT 0,
      weight_alert_percent INTEGER NOT NULL DEFAULT 10,
      tutor_member_id TEXT REFERENCES members(id),
      tutor_email TEXT NOT NULL,
      serious_mode INTEGER NOT NULL DEFAULT 0,
      retired_at TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE pet_tags (
      pet_id TEXT NOT NULL REFERENCES pets(id),
      tag TEXT NOT NULL,
      PRIMARY KEY (pet_id, tag)
    )`,
    `CREATE TABLE pet_allergies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pet_id TEXT NOT NULL REFERENCES pets(id),
      kind TEXT NOT NULL,
      description TEXT NOT NULL
    )`,
    `CREATE TABLE weights (
      id TEXT PRIMARY KEY,
      pet_id TEXT NOT NULL REFERENCES pets(id),
      grams INTEGER NOT NULL,
      on_date TEXT NOT NULL,
      member_id TEXT NOT NULL REFERENCES members(id),
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX weights_pet ON weights(pet_id, on_date)`,
    `INSERT INTO pets (id, name, species, tutor_email, created_at) VALUES
      ('pet-berenice', 'Berenice', 'cat', 'souza.pereira.valeria@gmail.com', '2026-11-04T00:00:00.000Z'),
      ('pet-panda', 'Panda', 'cat', 'souza.pereira.valeria@gmail.com', '2026-11-04T00:00:00.000Z'),
      ('pet-pacoca', 'Paçoca', 'dog', 'csrgamboa@gmail.com', '2026-11-04T00:00:00.000Z')`,
    `INSERT INTO pet_tags (pet_id, tag) VALUES
      ('pet-berenice', 'Exigente'), ('pet-berenice', 'Juíza Suprema'), ('pet-berenice', 'Olhar de Julgamento'),
      ('pet-panda', 'Especialista em Sonecas'), ('pet-panda', 'Crítico de Sachê'), ('pet-panda', 'Zero Estressado'),
      ('pet-pacoca', 'Diretora de Festas'), ('pet-pacoca', 'Auditora de Petiscos'), ('pet-pacoca', 'Carisma em Grau de Urgência')`,
    // Members who already joined take their chefes right away.
    `UPDATE pets SET tutor_member_id = (SELECT id FROM members WHERE members.email = pets.tutor_email AND members.active = 1)`,
  ],
  // 3: the estimated age (docs/spec/chefes.md) and the photos (ADR-009).
  [
    `ALTER TABLE pets ADD COLUMN birth_estimated INTEGER NOT NULL DEFAULT 0`,
    `CREATE TABLE pet_photos (
      pet_id TEXT PRIMARY KEY REFERENCES pets(id),
      image TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ],
  // 4: the vaccination card (docs/spec/vacinas.md). The booster date is computed from
  // `applied_on` + `interval_days`, never stored.
  [
    `CREATE TABLE vaccinations (
      id TEXT PRIMARY KEY,
      pet_id TEXT NOT NULL REFERENCES pets(id),
      vaccine TEXT NOT NULL,
      applied_on TEXT NOT NULL,
      interval_days INTEGER NOT NULL,
      lot TEXT,
      maker TEXT,
      vet TEXT,
      member_id TEXT NOT NULL REFERENCES members(id),
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX vaccinations_pet ON vaccinations(pet_id, applied_on)`,
  ],
  // 5: each chefe's vet, 24 h clinic and health plan, for the Cartão SOS (docs/spec/cartao-sos.md).
  [
    `ALTER TABLE pets ADD COLUMN vet_name TEXT`,
    `ALTER TABLE pets ADD COLUMN vet_phone TEXT`,
    `ALTER TABLE pets ADD COLUMN clinic_name TEXT`,
    `ALTER TABLE pets ADD COLUMN clinic_phone TEXT`,
    `ALTER TABLE pets ADD COLUMN plan_name TEXT`,
    `ALTER TABLE pets ADD COLUMN plan_number TEXT`,
  ],
  // 6: the push subscriptions (one per device) and which reminder stages already went out
  // (docs/spec/lembretes.md).
  [
    `CREATE TABLE push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX push_subscriptions_member ON push_subscriptions(member_id)`,
    `CREATE TABLE reminders_sent (
      pet_id TEXT NOT NULL REFERENCES pets(id),
      item TEXT NOT NULL,
      due_on TEXT NOT NULL,
      stage TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      PRIMARY KEY (pet_id, item, due_on, stage)
    )`,
  ],
  // 7: the address of the 24 h clinic, for the Cartão SOS (docs/spec/cartao-sos.md).
  [`ALTER TABLE pets ADD COLUMN clinic_address TEXT`],
];

export function migrate(sql: Sql): void {
  sql.run('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const [{ current }] = sql.all<{ current: number | null }>('SELECT MAX(version) AS current FROM schema_migrations');
  for (let version = (current ?? 0) + 1; version <= MIGRATIONS.length; version++) {
    sql.transaction(() => {
      for (const statement of MIGRATIONS[version - 1]) sql.run(statement);
      sql.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', version, new Date().toISOString());
    });
  }
}
