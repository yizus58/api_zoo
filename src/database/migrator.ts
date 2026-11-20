import { Sequelize } from 'sequelize';
import { SequelizeStorage, Umzug } from 'umzug';
import { MIGRATIONS } from './migrations';

/** Migrations are recorded in the "SequelizeMeta" table, as sequelize-cli does. */
export function createMigrator(
  sequelize: Sequelize,
  logger: Console | undefined = undefined,
) {
  return new Umzug({
    migrations: MIGRATIONS.map((migration) => ({
      name: migration.name,
      up: migration.up,
      down: migration.down,
    })),
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger,
  });
}
