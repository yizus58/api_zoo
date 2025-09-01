import { Injectable, Logger } from '@nestjs/common';
import crypto from 'crypto';
import { ExcelService } from './excel.service';
import { IndicatorsService } from './indicators.services';
import { PdfService } from './pdf.service';
import { RabbitMQService } from './rabbitmq.services';
import { S3Service } from './s3.service';
import { htmlContentFile } from '../../public/htmlReport.js';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly indicatorService: IndicatorsService,
    private readonly excelService: ExcelService,
    private readonly s3Service: S3Service,
    private readonly pdfService: PdfService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async executedDailyTask() {
    const dataResponse: Array<{
      id_user: string;
      email: string;
      files: object | null;
    }> = [];
    try {
      this.logger.log('Iniciando tarea diaria de generación de reportes...');

      const data = await this.indicatorService.animalsCommentPerDay();

      if (!data?.userAnimalComment || data.userAnimalComment.length === 0) {
        this.logger.warn('No hay comentarios para procesar hoy');
        return [];
      }

      for (const userInfo of data.userAnimalComment) {
        const generatedFileExcel = await this.generateExcelReport(userInfo);
        const generatedFilePdf = await this.generatePdfReport(userInfo);
        const filesS3 = [].concat(generatedFileExcel, generatedFilePdf);

        dataResponse.push({
          id_user: userInfo.user,
          email: userInfo.email,
          files: filesS3,
        });
      }
      return dataResponse;
    } catch (error) {
      this.logger.error(
        'Error en la tarea diaria de generación de reportes:',
        error,
      );
      throw error;
    }
  }

  async executeDailyTask() {
    const dataExecute = await this.executedDailyTask();
    if (dataExecute.length === 0) {
      return false;
    }

    const subject = 'Reporte diario de comentarios';

    for (const data of dataExecute) {
      console.log(`Enviando correo electrónico a ${data.email}...`);
      console.log('ATTACHMENTS: ', data.files);
      const html = htmlContentFile();
      const id = Math.floor(Math.random() * 1000000);
      const message = {
        type: 'email_notification',
        data: {
          userId: id,
          recipients: data.email,
          subject: subject,
          html: html,
          ...(data.files && { attachments: data.files }),
        },
        timestamp: new Date().toISOString(),
      };
      await this.rabbitMQService.publishMessageBackoff(message);
    }
  }

  async generateExcelReport(userInfo: any) {
    const today = new Date();
    const userId = userInfo.user.slice(0, 8);
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `reporte-diario-comentarios-${userId}-${dateStr}.xlsx`;
    this.logger.log(`Generando reporte para el archivo: ${fileName}`);

    const buffer = await this.excelService.generarExcelPorUsuario(userInfo);

    if (!buffer || typeof buffer === 'boolean') {
      this.logger.error('Error al generar el buffer del Excel para S3/R2');
      return;
    }

    try {
      const nameS3 = crypto.randomBytes(16).toString('hex');
      const contentType =
        process.env.MIME_TYPE_EXCEL ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      await this.s3Service.uploadFile(buffer, contentType, nameS3);
      this.logger.log(`Archivo EXCEL subido a S3/R2 exitosamente: ${nameS3}`);
      return { name_file: fileName, s3_name: nameS3 };
    } catch (error: any) {
      this.logger.error(
        'Error al subir archivo a S3/R2:',
        error?.message ?? String(error),
      );
    }
  }

  async generatePdfReport(userInfo: any) {
    const today = new Date();
    const userId = userInfo.user.slice(0, 8);
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `reporte-diario-comentarios-${userId}-${dateStr}.pdf`;
    this.logger.log(`Generando reporte para el archivo: ${fileName}`);

    const buffer = await this.pdfService.generarPdfPorUsuario(userInfo);

    if (!buffer || typeof buffer === 'boolean') {
      this.logger.error('Error al generar el buffer del PDF para S3/R2');
      return;
    }

    try {
      const nameS3 = crypto.randomBytes(16).toString('hex');
      const contentType = process.env.MIME_TYPE_PDF || 'application/pdf';

      await this.s3Service.uploadFile(buffer, contentType, nameS3);
      this.logger.log(`Archivo PDF subido a S3/R2 exitosamente: ${nameS3}`);
      return { name_file: fileName, s3_name: nameS3 };
    } catch (error: any) {
      this.logger.error(
        'Error al subir archivo a S3/R2:',
        error?.message ?? String(error),
      );
    }
  }
}
