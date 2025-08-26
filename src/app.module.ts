import { AppService } from './app.service';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database.module';
import { UserModule } from './modules/user.module';
import { AuthModule } from './modules/auth.module';
import { ZoneModule } from './modules/zone.module';
import { SpeciesModule } from './modules/species.module';
import { AnimalModule } from './modules/animal.module';
import { CommentModule } from './modules/comment.module';
import { IndicatorsModule } from './modules/indicators.module';

const environment = process.env.NODE_ENV;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environment ? '.env' + '.' + environment : '.env',
    }),
    DatabaseModule,
    UserModule,
    AuthModule,
    ZoneModule,
    SpeciesModule,
    AnimalModule,
    CommentModule,
    IndicatorsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
