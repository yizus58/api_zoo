import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { localDate } from '../../common/utils/day-range';
import { RabbitMQService } from '../../integrations/messaging/rabbitmq.service';
import {
  EMAIL_NOTIFICATION_TYPE,
  EmailAttachment,
} from '../../integrations/messaging/queue.constants';
import { S3Service } from '../../integrations/storage/s3.service';
import { DEFAULT_TIMEZONE } from '../indicators/indicators.service';
import { DailyCommentsService } from './daily-comments.service';
import { EXCEL_MIME, ExcelReportService } from './excel-report.service';
import { PDF_MIME, PdfReportService } from './pdf-report.service';
import { dailyReportEmailHtml } from './report-email.template';
import { UserReport } from './report.types';

export const REPORT_SUBJECT = 'Reporte diario de comentarios';

export interface DailyReportResult {
  sent: number;
  failed: number;
}

/**
 * Daily report: for every employee whose animals were commented today, builds an Excel and a
 * PDF, uploads both to storage and queues an e-mail for api-mail with them as attachments.
 * One employee failing does not stop the others.
 */
@Injectable()
export class DailyReportService {
  private readonly logger = new Logger(DailyReportService.name);

  constructor(
    private readonly dailyComments: DailyCommentsService,
    private readonly excel: ExcelReportService,
    private readonly pdf: PdfReportService,
    private readonly storage: S3Service,
    private readonly messaging: RabbitMQService,
    private readonly config: ConfigService,
  ) {}

  async run(now: Date = new Date()): Promise<DailyReportResult> {
    const reports = await this.dailyComments.collect(now);
    if (reports.length === 0) {
      this.logger.log('No hay comentarios para reportar hoy');
      return { sent: 0, failed: 0 };
    }

    const result: DailyReportResult = { sent: 0, failed: 0 };
    for (const report of reports) {
      try {
        await this.sendReport(report, now);
        result.sent++;
      } catch (error) {
        result.failed++;
        this.logger.error(
          `No se pudo enviar el reporte del usuario ${report.user}: ${(error as Error).message}`,
        );
      }
    }
    this.logger.log(
      `Reportes diarios: ${result.sent} enviados, ${result.failed} fallidos`,
    );
    return result;
  }

  private async sendReport(report: UserReport, now: Date): Promise<void> {
    const date = localDate(
      this.config.get('APP_TIMEZONE', DEFAULT_TIMEZONE),
      now,
    );
    const baseName = `reporte-diario-comentarios-${report.user.slice(0, 8)}-${date}`;

    const [excel, pdf] = await Promise.all([
      this.excel.build(report),
      this.pdf.build(report),
    ]);
    const attachments: EmailAttachment[] = [];
    try {
      attachments.push({
        name_file: `${baseName}.xlsx`,
        s3_name: await this.storage.upload(excel, EXCEL_MIME),
      });
      attachments.push({
        name_file: `${baseName}.pdf`,
        s3_name: await this.storage.upload(pdf, PDF_MIME),
      });
      await this.publish(report, attachments, now);
    } catch (error) {
      // Nobody will download (and delete) these files: remove them.
      await Promise.allSettled(
        attachments.map((file) => this.storage.delete(file.s3_name)),
      );
      throw error;
    }
  }

  private async publish(
    report: UserReport,
    attachments: EmailAttachment[],
    now: Date,
  ): Promise<void> {
    await this.messaging.publish({
      type: EMAIL_NOTIFICATION_TYPE,
      data: {
        userId: report.user,
        recipients: report.email,
        subject: REPORT_SUBJECT,
        html: dailyReportEmailHtml(),
        attachments,
      },
      timestamp: now.toISOString(),
    });
  }
}
