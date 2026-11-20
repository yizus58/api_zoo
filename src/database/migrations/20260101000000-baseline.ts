import { QueryInterface } from 'sequelize';

/**
 * Baseline: the schema the application used to create with sequelize.sync().
 * Every statement is IF NOT EXISTS, so it is a no-op on databases that were created
 * by sync and creates the same schema on a new database.
 */
export const name = '20260101000000-baseline';

export async function up({ context }: { context: QueryInterface }) {
  await context.sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE enum_users_role AS ENUM ('ADMIN', 'EMPLEADO', 'USUARIO');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      email varchar(255) NOT NULL CONSTRAINT users_email_key UNIQUE,
      password varchar(255) NOT NULL,
      role enum_users_role NOT NULL DEFAULT 'EMPLEADO'
    );

    CREATE TABLE IF NOT EXISTS areas (
      id uuid PRIMARY KEY,
      nombre varchar(255) NOT NULL CONSTRAINT areas_nombre_key UNIQUE
    );

    CREATE TABLE IF NOT EXISTS species (
      id uuid PRIMARY KEY,
      nombre varchar(255) NOT NULL CONSTRAINT species_nombre_key UNIQUE,
      id_area uuid CONSTRAINT species_id_area_fkey REFERENCES areas(id) ON UPDATE CASCADE ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS animals (
      id uuid PRIMARY KEY,
      nombre varchar(255) NOT NULL CONSTRAINT animals_nombre_key UNIQUE,
      id_especie uuid CONSTRAINT animals_id_especie_fkey REFERENCES species(id) ON UPDATE CASCADE ON DELETE CASCADE,
      id_user uuid CONSTRAINT animals_id_user_fkey REFERENCES users(id) ON UPDATE CASCADE,
      fecha timestamptz NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id uuid PRIMARY KEY,
      comentario text NOT NULL,
      id_animal uuid CONSTRAINT comments_id_animal_fkey REFERENCES animals(id) ON UPDATE CASCADE ON DELETE CASCADE,
      id_user uuid CONSTRAINT comments_id_user_fkey REFERENCES users(id) ON UPDATE CASCADE,
      id_comentario_principal uuid CONSTRAINT comments_id_comentario_principal_fkey REFERENCES comments(id) ON UPDATE CASCADE ON DELETE SET NULL,
      fecha timestamptz NOT NULL
    );
  `);
}

export async function down({ context }: { context: QueryInterface }) {
  await context.sequelize.query(`
    DROP TABLE IF EXISTS comments;
    DROP TABLE IF EXISTS animals;
    DROP TABLE IF EXISTS species;
    DROP TABLE IF EXISTS areas;
    DROP TABLE IF EXISTS users;
    DROP TYPE IF EXISTS enum_users_role;
  `);
}
