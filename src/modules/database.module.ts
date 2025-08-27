import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../models/user.model';
import { Animal } from '../models/animal.model';
import { Species } from '../models/species.model';
import { Comment } from '../models/comment.model';
import { Zone } from '../models/zone.model';
import { DatabaseInitService } from '../services/database-init.service';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('NODE_ENV') === 'production';
        const isDevelopment =
          configService.get<string>('NODE_ENV') === 'development';

        const dbConfig = {
          dialect: 'postgres' as const,
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          autoLoadModels: true,
          synchronize: !isProduction,
          sync: isDevelopment ? { force: false, alter: true } : {},
          logging: false,
          define: {
            timestamps: false,
          },
          pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
          },
          retry: {
            match: [
              /ETIMEDOUT/,
              /EHOSTUNREACH/,
              /ECONNRESET/,
              /ECONNREFUSED/,
              /ETIMEDOUT/,
            ],
            max: 3,
          },
          dialectOptions: {
            connectTimeout: 60000,
          },
        };

        if (!dbConfig.username || !dbConfig.password || !dbConfig.database) {
          throw new Error(
            'Configuración de base de datos incompleta. Por favor revisa tu archivo .env.',
          );
        }

        return dbConfig;
      },
      inject: [ConfigService],
    }),
    SequelizeModule.forFeature([User, Animal, Species, Comment, Zone]),
  ],
  providers: [DatabaseInitService],
  exports: [SequelizeModule, DatabaseInitService],
})
export class DatabaseModule {}
