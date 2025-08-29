import { Module } from '@nestjs/common';
import { CronService } from '../services/cron.service';
import { DatabaseModule } from './database.module';
import { IndicatorsModule } from './indicators.module';
import { ExcelModule } from './excel.module';
import { S3Module } from './s3.module';
import { PdfModule } from './pdf.module';

@Module({
  imports: [ExcelModule, DatabaseModule, IndicatorsModule, S3Module, PdfModule],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
