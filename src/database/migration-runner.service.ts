import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize-typescript';
import { flag } from '../config/env.validation';
import { createMigrator } from './migrator';

/** Applies pending migrations when the application starts (DB_MIGRATE=false to skip). */
@Injectable()
export class MigrationRunner implements OnModuleInit {
  private readonly logger = new Logger(MigrationRunner.name);

  constructor(
    private readonly sequelize: Sequelize,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!flag(this.config.get('DB_MIGRATE'), true)) {
      this.logger.log('DB_MIGRATE=false: migrations skipped');
      return;
    }
    const applied = await createMigrator(this.sequelize).up();
    this.logger.log(
      applied.length > 0
        ? `Applied migrations: ${applied.map((m) => m.name).join(', ')}`
        : 'Database schema is up to date',
    );
  }
}
