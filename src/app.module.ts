import { AppService } from './app.service';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database.module';
import { UserModule } from './modules/user.module';
import { AuthModule } from './modules/auth.module';
import { ZoneModule } from './modules/zone.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    UserModule,
    AuthModule,
    ZoneModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
