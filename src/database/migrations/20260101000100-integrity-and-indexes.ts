import { QueryInterface } from 'sequelize';

/**
 * - Drops the duplicate UNIQUE constraints that sync({ alter: true }) added on every start
 *   (users_email_key1, users_email_key2, ...).
 * - Replaces the cascading foreign keys that silently deleted data: deleting an area no
 *   longer deletes its species and their animals, and deleting a species no longer deletes
 *   its animals (the API already refuses those deletions with 409; now the database does too).
 *   Comments still go with their animal, and replies now go with their main comment instead
 *   of turning into orphan main comments.
 * - Adds indexes for the foreign keys and the date filters used by the daily report.
 */
export const name = '20260101000100-integrity-and-indexes';

export async function up({ context }: { context: QueryInterface }) {
  await context.sequelize.query(`
    DO $$
    DECLARE c record;
    BEGIN
      FOR c IN
        SELECT conrelid::regclass::text AS tbl, conname
        FROM pg_constraint
        WHERE contype = 'u'
          AND conname ~ '^(users_email|areas_nombre|species_nombre|animals_nombre)_key[0-9]+$'
      LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', c.tbl, c.conname);
      END LOOP;
    END $$;

    ALTER TABLE species DROP CONSTRAINT IF EXISTS species_id_area_fkey,
      ADD CONSTRAINT species_id_area_fkey FOREIGN KEY (id_area) REFERENCES areas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
    ALTER TABLE animals DROP CONSTRAINT IF EXISTS animals_id_especie_fkey,
      ADD CONSTRAINT animals_id_especie_fkey FOREIGN KEY (id_especie) REFERENCES species(id) ON UPDATE CASCADE ON DELETE RESTRICT;
    ALTER TABLE animals DROP CONSTRAINT IF EXISTS animals_id_user_fkey,
      ADD CONSTRAINT animals_id_user_fkey FOREIGN KEY (id_user) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
    ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_id_animal_fkey,
      ADD CONSTRAINT comments_id_animal_fkey FOREIGN KEY (id_animal) REFERENCES animals(id) ON UPDATE CASCADE ON DELETE CASCADE;
    ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_id_user_fkey,
      ADD CONSTRAINT comments_id_user_fkey FOREIGN KEY (id_user) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
    ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_id_comentario_principal_fkey,
      ADD CONSTRAINT comments_id_comentario_principal_fkey FOREIGN KEY (id_comentario_principal) REFERENCES comments(id) ON UPDATE CASCADE ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS species_id_area_idx ON species (id_area);
    CREATE INDEX IF NOT EXISTS animals_id_especie_idx ON animals (id_especie);
    CREATE INDEX IF NOT EXISTS animals_id_user_idx ON animals (id_user);
    CREATE INDEX IF NOT EXISTS animals_fecha_idx ON animals (fecha);
    CREATE INDEX IF NOT EXISTS comments_id_animal_idx ON comments (id_animal);
    CREATE INDEX IF NOT EXISTS comments_id_comentario_principal_idx ON comments (id_comentario_principal);
    CREATE INDEX IF NOT EXISTS comments_fecha_idx ON comments (fecha);
  `);
}

export async function down({ context }: { context: QueryInterface }) {
  await context.sequelize.query(`
    DROP INDEX IF EXISTS species_id_area_idx, animals_id_especie_idx, animals_id_user_idx,
      animals_fecha_idx, comments_id_animal_idx, comments_id_comentario_principal_idx, comments_fecha_idx;

    ALTER TABLE species DROP CONSTRAINT IF EXISTS species_id_area_fkey,
      ADD CONSTRAINT species_id_area_fkey FOREIGN KEY (id_area) REFERENCES areas(id) ON UPDATE CASCADE ON DELETE CASCADE;
    ALTER TABLE animals DROP CONSTRAINT IF EXISTS animals_id_especie_fkey,
      ADD CONSTRAINT animals_id_especie_fkey FOREIGN KEY (id_especie) REFERENCES species(id) ON UPDATE CASCADE ON DELETE CASCADE;
    ALTER TABLE animals DROP CONSTRAINT IF EXISTS animals_id_user_fkey,
      ADD CONSTRAINT animals_id_user_fkey FOREIGN KEY (id_user) REFERENCES users(id) ON UPDATE CASCADE;
    ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_id_user_fkey,
      ADD CONSTRAINT comments_id_user_fkey FOREIGN KEY (id_user) REFERENCES users(id) ON UPDATE CASCADE;
    ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_id_comentario_principal_fkey,
      ADD CONSTRAINT comments_id_comentario_principal_fkey FOREIGN KEY (id_comentario_principal) REFERENCES comments(id) ON UPDATE CASCADE ON DELETE SET NULL;
  `);
}
