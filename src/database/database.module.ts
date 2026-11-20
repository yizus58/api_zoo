import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  databaseSettings,
  ensureDatabaseExists,
  sequelizeOptions,
} from '../config/database';
import { flag } from '../config/env.validation';
import { MigrationRunner } from './migration-runner.service';

/** Sequelize options from the environment; creates the database first when allowed. */
export async function sequelizeFactory(config: ConfigService) {
  const settings = databaseSettings(config);
  const createIfMissing = flag(
    config.get('DB_CREATE_IF_MISSING'),
    config.get('NODE_ENV') !== 'production',
  );
  if (createIfMissing && (await ensureDatabaseExists(settings))) {
    new Logger('Database').log(`Base de datos ${settings.database} creada`);
  }
  return sequelizeOptions(settings);
}

@Global()
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: sequelizeFactory,
    }),
  ],
  providers: [MigrationRunner],
})
export class DatabaseModule {}
