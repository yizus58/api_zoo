import { Module } from '@nestjs/common';
import { PdfService } from '../services/pdf.service';
import { DatabaseModule } from './database.module';
import { IndicatorsModule } from './indicators.module';

@Module({
  imports: [DatabaseModule, IndicatorsModule],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
