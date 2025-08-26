import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class DatabaseInitService {
  constructor(private readonly configService: ConfigService) {}

  async initializeDatabase(): Promise<void> {
    const dbName = this.configService.get<string>('DB_NAME');
    const dbHost = this.configService.get<string>('DB_HOST', 'localhost');
    const dbPort = this.configService.get<number>('DB_PORT', 5432);
    const dbUsername = this.configService.get<string>('DB_USERNAME');
    const dbPassword = this.configService.get<string>('DB_PASSWORD');

    const client = new Client({
      host: dbHost,
      port: dbPort,
      user: dbUsername,
      password: dbPassword,
      database: 'postgres',
    });

    try {
      await client.connect();

      const result = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [dbName],
      );

      if (result.rows.length === 0) {
        await client.query(`CREATE DATABASE "${dbName}"`);
      }
    } catch (error) {
      console.error(`Error al inicializar la base de datos: ${error.message}`);
      throw error;
    } finally {
      await client.end();
    }
  }

  async syncModels(): Promise<void> {
    try {
      const sequelize = new Sequelize({
        dialect: 'postgres',
        host: this.configService.get<string>('DB_HOST', 'localhost'),
        port: this.configService.get<number>('DB_PORT', 5432),
        username: this.configService.get<string>('DB_USERNAME'),
        password: this.configService.get<string>('DB_PASSWORD'),
        database: this.configService.get<string>('DB_NAME'),
        logging: false,
      });

      await sequelize.sync({ alter: true });

      await sequelize.close();
    } catch (error) {
      console.error(`Error al sincronizar modelos: ${error.message}`);
      throw error;
    }
  }
}
