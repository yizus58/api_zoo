import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import { Sequelize } from 'sequelize-typescript';
import { Animal } from '../models/animal.model';
import { Species } from '../models/species.model';
import { Comment } from '../models/comment.model';
import { User } from '../models/user.model';
import { Zone } from '../models/zone.model';
@Injectable()
export class DatabaseInitService {
  private sequelizeInstance: Sequelize | null = null;

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

  async isConnectionActive(): Promise<boolean> {
    if (!this.sequelizeInstance) {
      return false;
    }

    try {
      await this.sequelizeInstance.authenticate();
      return true;
    } catch (error) {
      console.warn('La conexión existente no es válida:', error.message);
      this.sequelizeInstance = null;
      return false;
    }
  }

  async getSequelizeInstance(): Promise<Sequelize> {
    const isActive = await this.isConnectionActive();

    if (isActive && this.sequelizeInstance) {
      return this.sequelizeInstance;
    }

    console.log('Creando nueva conexión a la base de datos');
    this.sequelizeInstance = new Sequelize({
      dialect: 'postgres',
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USERNAME'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_NAME'),
      models: [Zone, Species, Animal, Comment, User],
      logging: false,
    });

    try {
      await this.sequelizeInstance.authenticate();
      console.log('Conexión a la base de datos establecida correctamente');
    } catch (error) {
      console.error('Error al conectar a la base de datos:', error.message);
      this.sequelizeInstance = null;
      throw error;
    }

    return this.sequelizeInstance;
  }

  async syncModels(): Promise<void> {
    try {
      const sequelize = await this.getSequelizeInstance();

      console.log('Sincronizando modelos de la base de datos...');
      await sequelize.sync({ alter: true });
      console.log('Modelos sincronizados correctamente');

    } catch (error) {
      console.error(`Error al sincronizar modelos: ${error.message}`);
      throw error;
    }
  }

  async closeConnection(): Promise<void> {
    if (this.sequelizeInstance) {
      try {
        await this.sequelizeInstance.close();
        console.log('Conexión a la base de datos cerrada correctamente');
      } catch (error) {
        console.error('Error al cerrar la conexión:', error.message);
      } finally {
        this.sequelizeInstance = null;
      }
    }
  }

  getCurrentSequelizeInstance(): Sequelize | null {
    return this.sequelizeInstance;
  }
}
