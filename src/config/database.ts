import { ConfigService } from '@nestjs/config';
import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { Client } from 'pg';
import { MODELS } from '../database/models';

export interface DatabaseSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export function databaseSettings(config: ConfigService): DatabaseSettings {
  return {
    host: config.get<string>('DB_HOST', 'localhost'),
    port: Number(config.get<string>('DB_PORT', '5432')),
    username: config.getOrThrow<string>('DB_USERNAME'),
    password: config.getOrThrow<string>('DB_PASSWORD'),
    database: config.getOrThrow<string>('DB_NAME'),
  };
}

/** The schema is owned by the migrations: Sequelize never syncs or alters tables. */
export function sequelizeOptions(
  settings: DatabaseSettings,
): SequelizeModuleOptions {
  return {
    dialect: 'postgres',
    ...settings,
    models: MODELS,
    autoLoadModels: false,
    synchronize: false,
    logging: false,
    define: { timestamps: false },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    retry: {
      match: [/ETIMEDOUT/, /EHOSTUNREACH/, /ECONNRESET/, /ECONNREFUSED/],
      max: 3,
    },
  };
}

/** Creates the database if it does not exist yet (local development convenience). */
export async function ensureDatabaseExists(
  settings: DatabaseSettings,
): Promise<boolean> {
  const client = new Client({
    host: settings.host,
    port: settings.port,
    user: settings.username,
    password: settings.password,
    database: 'postgres',
  });
  await client.connect();
  try {
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [settings.database],
    );
    if (result.rows.length > 0) {
      return false;
    }
    await client.query(
      `CREATE DATABASE "${settings.database.replace(/"/g, '""')}"`,
    );
    return true;
  } finally {
    await client.end();
  }
}
