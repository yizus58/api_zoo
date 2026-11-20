import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AnimalsModule } from './modules/animals/animals.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommentsModule } from './modules/comments/comments.module';
import { IndicatorsModule } from './modules/indicators/indicators.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SpeciesModule } from './modules/species/species.module';
import { UsersModule } from './modules/users/users.module';
import { ZonesModule } from './modules/zones/zones.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env.<NODE_ENV> first, then .env; real environment variables win over both.
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
      validate: validateEnv,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ZonesModule,
    SpeciesModule,
    AnimalsModule,
    CommentsModule,
    IndicatorsModule,
    ReportsModule,
  ],
})
export class AppModule {}
