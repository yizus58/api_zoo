import { Module } from '@nestjs/common';
import { ExcelService } from '../services/excel.service';
import { DatabaseModule } from './database.module';
import { IndicatorsModule } from './indicators.module';

@Module({
  imports: [DatabaseModule, IndicatorsModule],
  providers: [ExcelService],
  exports: [ExcelService],
})
export class ExcelModule {}
