import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SequelizeModule } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { validateEnv } from '../config/env.validation';
import { sequelizeFactory } from './database.module';
import { createMigrator } from './migrator';
import { seedDemoData } from './seeds/demo-data.seeder';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
      validate: validateEnv,
    }),
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: sequelizeFactory,
    }),
  ],
})
class CliModule {}

const USAGE = `Usage: node dist/database/cli.js <command>
  migrate         apply pending migrations
  migrate:down    revert the last migration
  migrate:status  list applied and pending migrations
  seed [--reset]  random demo data (needs DEMO_USER_PASSWORD); --reset deletes existing data first`;

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (
    !command ||
    !['migrate', 'migrate:down', 'migrate:status', 'seed'].includes(command)
  ) {
    console.log(USAGE);
    process.exitCode = command ? 1 : 0;
    return;
  }

  // The application logger only prints warnings and errors here; results go to stdout.
  const logger = { log: (message: string) => console.log(message) };
  const app = await NestFactory.createApplicationContext(CliModule, {
    logger: ['error', 'warn'],
  });
  try {
    const sequelize = app.get(Sequelize);
    const migrator = createMigrator(sequelize);

    if (command === 'migrate') {
      const applied = await migrator.up();
      logger.log(
        applied.length
          ? `Applied: ${applied.map((m) => m.name).join(', ')}`
          : 'Nothing to apply',
      );
    } else if (command === 'migrate:down') {
      const reverted = await migrator.down();
      logger.log(
        reverted.length ? `Reverted: ${reverted[0].name}` : 'Nothing to revert',
      );
    } else if (command === 'migrate:status') {
      for (const m of await migrator.executed())
        logger.log(`applied  ${m.name}`);
      for (const m of await migrator.pending())
        logger.log(`pending  ${m.name}`);
    } else {
      const config = app.get(ConfigService);
      const employeePassword = config.get<string>('DEMO_USER_PASSWORD');
      if (!employeePassword || employeePassword.length < 8) {
        throw new Error(
          'DEMO_USER_PASSWORD (8+ characters) is required to seed demo users',
        );
      }
      await migrator.up();
      const result = await seedDemoData(sequelize, {
        employees: Number(config.get('SEEDER_ADDITIONAL_USERS', 5)),
        zones: Number(config.get('SEEDER_ZONES_COUNT', 3)),
        speciesPerZone: Number(config.get('SEEDER_SPECIES_PER_ZONE', 5)),
        animalsPerSpecies: Number(config.get('SEEDER_ANIMALS_PER_SPECIES', 5)),
        commentsPerAnimal: Number(config.get('SEEDER_COMMENTS_PER_ANIMAL', 3)),
        employeePassword,
        reset: args.includes('--reset'),
      });
      logger.log(
        result.skipped
          ? 'The database already has data; nothing seeded (use --reset to replace it)'
          : `Seeded ${JSON.stringify(result)}`,
      );
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  new Logger('db').error(error instanceof Error ? error.message : error);
  process.exit(1);
});
