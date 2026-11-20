import { randomUUID } from 'crypto';
import { Client } from 'pg';
import { Sequelize, QueryTypes } from 'sequelize';
import { ensureDatabaseExists } from '../src/config/database';
import { createMigrator } from '../src/database/migrator';
import { describeWithDb } from './support/test-app';

/** Runs against its own scratch database (TEST_DB_NAME + "_migrations"), dropped afterwards. */
describeWithDb('Database migrations (e2e)', () => {
  const settings = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: `${process.env.DB_NAME}_migrations`,
  };
  let sequelize: Sequelize;

  const admin = async (sql: string) => {
    const client = new Client({
      ...settings,
      user: settings.username,
      database: 'postgres',
    });
    await client.connect();
    try {
      await client.query(sql);
    } finally {
      await client.end();
    }
  };
  const dropDatabase = () =>
    admin(`DROP DATABASE IF EXISTS "${settings.database}" WITH (FORCE)`);
  const rows = <T extends object>(sql: string) =>
    sequelize.query<T>(sql, { type: QueryTypes.SELECT });
  const constraints = () =>
    rows<{ name: string; type: string; on_delete: string }>(
      `SELECT conname AS name, contype AS type, confdeltype AS on_delete
       FROM pg_constraint WHERE connamespace = 'public'::regnamespace ORDER BY conname`,
    );
  const onDelete = async (name: string) =>
    (await constraints()).find((c) => c.name === name)?.on_delete;

  beforeEach(async () => {
    await dropDatabase();
    expect(await ensureDatabaseExists(settings)).toBe(true);
    expect(await ensureDatabaseExists(settings)).toBe(false);
    sequelize = new Sequelize({
      dialect: 'postgres',
      ...settings,
      logging: false,
    });
  });
  afterEach(async () => {
    await sequelize.close();
  });
  afterAll(dropDatabase);

  it('fresh database: up creates the schema, status is tracked, down removes everything', async () => {
    const migrator = createMigrator(sequelize);
    expect((await migrator.pending()).map((m) => m.name)).toEqual([
      '20260101000000-baseline',
      '20260101000100-integrity-and-indexes',
    ]);

    await migrator.up();

    expect(await migrator.pending()).toEqual([]);
    expect((await migrator.executed()).map((m) => m.name)).toHaveLength(2);
    const tables = await rows<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`,
    );
    expect(tables.map((t) => t.tablename)).toEqual([
      'SequelizeMeta',
      'animals',
      'areas',
      'comments',
      'species',
      'users',
    ]);
    expect(await onDelete('species_id_area_fkey')).toBe('r');
    expect(await onDelete('animals_id_especie_fkey')).toBe('r');
    expect(await onDelete('comments_id_animal_fkey')).toBe('c');
    expect(await onDelete('comments_id_comentario_principal_fkey')).toBe('c');

    await migrator.up(); // idempotent
    await migrator.down({ to: 0 as const });

    const left = await rows<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );
    expect(left.map((t) => t.tablename)).toEqual(['SequelizeMeta']);
    expect(await migrator.pending()).toHaveLength(2);
  });

  it('legacy database created by sync({ alter }): duplicate constraints dropped, cascades fixed, data kept', async () => {
    // Recreate what the old app left behind: the sync schema plus the duplicate UNIQUE
    // constraints that alter added on every start, and no SequelizeMeta table.
    await createMigrator(sequelize).up({ to: '20260101000000-baseline' });
    await sequelize.query(`
      DROP TABLE "SequelizeMeta";
      ALTER TABLE users ADD CONSTRAINT users_email_key1 UNIQUE (email);
      ALTER TABLE users ADD CONSTRAINT users_email_key2 UNIQUE (email);
      ALTER TABLE areas ADD CONSTRAINT areas_nombre_key1 UNIQUE (nombre);
      ALTER TABLE animals ADD CONSTRAINT animals_nombre_key1 UNIQUE (nombre);
    `);
    const [user, area, species, animal, main, reply] = Array.from(
      { length: 6 },
      () => randomUUID(),
    );
    await sequelize.query(
      `INSERT INTO users VALUES (:user, 'old@mail.com', 'hash', 'EMPLEADO');
       INSERT INTO areas VALUES (:area, 'Sabana');
       INSERT INTO species VALUES (:species, 'Felinos', :area);
       INSERT INTO animals VALUES (:animal, 'Leon', :species, :user, now());
       INSERT INTO comments VALUES (:main, 'Hola', :animal, :user, NULL, now());
       INSERT INTO comments VALUES (:reply, 'Respuesta', :animal, :user, :main, now());`,
      { replacements: { user, area, species, animal, main, reply } },
    );

    await createMigrator(sequelize).up();

    const names = (await constraints()).map((c) => c.name);
    expect(names.filter((n) => /_key\d+$/.test(n))).toEqual([]);
    expect(names).toEqual(
      expect.arrayContaining([
        'users_email_key',
        'areas_nombre_key',
        'animals_nombre_key',
      ]),
    );
    const [{ count }] = await rows<{ count: string }>(
      `SELECT (SELECT count(*) FROM users) + (SELECT count(*) FROM areas) + (SELECT count(*) FROM species)
        + (SELECT count(*) FROM animals) + (SELECT count(*) FROM comments) AS count`,
    );
    expect(Number(count)).toBe(6);

    // Deleting an area used to delete its species and their animals silently.
    await expect(
      sequelize.query('DELETE FROM areas WHERE id = :area', {
        replacements: { area },
      }),
    ).rejects.toThrow();
    // Deleting a main comment now deletes its replies instead of orphaning them.
    await sequelize.query('DELETE FROM comments WHERE id = :main', {
      replacements: { main },
    });
    const [{ left }] = await rows<{ left: string }>(
      'SELECT count(*) AS left FROM comments',
    );
    expect(Number(left)).toBe(0);
  });
});
