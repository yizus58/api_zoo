import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from './auth.module';
import { DatabaseModule } from './database.module';
import { RolesGuard } from '../guards/roles.guard';
import { IndicatorsController } from '../controllers/indicators.controller';
import { IndicatorsService } from '../services/indicators.services';
import { AxiosService } from '../services/axios.service';

@Module({
  imports: [DatabaseModule, AuthModule, HttpModule],
  controllers: [IndicatorsController],
  providers: [IndicatorsService, RolesGuard, AxiosService],
  exports: [IndicatorsService, AxiosService],
})
export class IndicatorsModule {}
