import { Module } from '@nestjs/common';
import { CronService } from '../services/cron.service';
import { DatabaseModule } from './database.module';
import { IndicatorsModule } from './indicators.module';
import { ExcelModule } from './excel.module';

@Module({
  imports: [DatabaseModule, IndicatorsModule, ExcelModule],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
