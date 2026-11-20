import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MessagingModule } from '../../integrations/messaging/messaging.module';
import { StorageModule } from '../../integrations/storage/storage.module';
import { Comment } from '../comments/comment.model';
import { DailyCommentsService } from './daily-comments.service';
import { DailyReportService } from './daily-report.service';
import { ExcelReportService } from './excel-report.service';
import { PdfReportService } from './pdf-report.service';
import { ReportsScheduler } from './reports.scheduler';

@Module({
  imports: [
    SequelizeModule.forFeature([Comment]),
    StorageModule,
    MessagingModule,
  ],
  providers: [
    DailyCommentsService,
    ExcelReportService,
    PdfReportService,
    DailyReportService,
    ReportsScheduler,
  ],
})
export class ReportsModule {}
