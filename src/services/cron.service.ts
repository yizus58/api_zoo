import { Injectable, Logger } from '@nestjs/common';
import { IndicatorsService } from './indicators.services';
import { ExcelService } from './excel.service';
import { PdfService } from './pdf.service';
import { S3Service } from './s3.service';
import crypto from 'crypto';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly indicatorService: IndicatorsService,
    private readonly excelService: ExcelService,
    private readonly s3Service: S3Service,
    private readonly pdfService: PdfService,
  ) {}

  async executeDailyTask() {
    const perUserResults: Array<{
      userId: string;
      fileName?: string;
      error: string | null;
    }> = [];
    try {
      this.logger.log('Iniciando tarea diaria de generación de reportes...');

      const data = await this.indicatorService.animalsCommentPerDay();

      if (!data?.userAnimalComment || data.userAnimalComment.length === 0) {
        this.logger.warn('No hay comentarios para procesar hoy');
        return {
          success: false,
          message: 'No hay comentarios para procesar hoy',
          totalUsers: 0,
          totalComments: 0,
          results: [],
        };
      }

      for (const userInfo of data.userAnimalComment) {
        this.logger.log('Generando reporte para el usuario:', userInfo);

        const generatedFileExcel = await this.generateExcelReport(userInfo);
        const generatedFilePdf = await this.generatePdfReport(userInfo);
      }

      const totalProcessed = data.userAnimalComment.length;
      const totalComments = data.animalsComments?.length || 0;
      const totalErrors = perUserResults.filter((r) => r.error).length;

      this.logger.log(
        `Total de usuarios procesados: ${totalProcessed}. Errores: ${totalErrors}`,
      );

      return {
        success: totalErrors === 0,
        totalUsers: totalProcessed,
        totalComments,
        errors: totalErrors,
        //results: perUserResults,
      };
    } catch (error) {
      this.logger.error(
        'Error en la tarea diaria de generación de reportes:',
        error,
      );
      throw error;
    }
  }

  async generateExcelReport(userInfo: any) {
    const perUserResults: Array<{
      userId: string;
      fileName?: string;
      error: string | null;
    }> = [];
    const today = new Date();
    const userId = userInfo.user.slice(0, 8);
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `reporte-diario-comentarios-${userId}-${dateStr}.xlsx`;
    this.logger.log(`Generando reporte para el archivo: ${fileName}`);

    const buffer = await this.excelService.generarExcelPorUsuario(userInfo);

    if (!buffer || typeof buffer === 'boolean') {
      this.logger.error('Error al generar el buffer del Excel para S3/R2');
      perUserResults.push({
        userId,
        fileName,
        error: 'Error al generar el buffer del Excel para S3/R2',
      });
      return;
    }

    try {
      const nameS3 = crypto.randomBytes(16).toString('hex');
      const contentType =
        process.env.MIME_TYPE_EXCEL ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      await this.s3Service.uploadFile(buffer, contentType, nameS3);
      this.logger.log(`Archivo EXCEL subido a S3/R2 exitosamente: ${nameS3}`);
      perUserResults.push({ userId, fileName, error: null });
    } catch (error: any) {
      this.logger.error(
        'Error al subir archivo a S3/R2:',
        error?.message ?? String(error),
      );
      perUserResults.push({
        userId,
        fileName,
        error: `Error al subir archivo a S3/R2: ${error?.message ?? String(error)}`,
      });
    }
    return perUserResults;
  }

  async generatePdfReport(userInfo: any) {
    const perUserResults: Array<{
      userId: string;
      fileName?: string;
      error: string | null;
    }> = [];
    const today = new Date();
    const userId = userInfo.user.slice(0, 8);
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `reporte-diario-comentarios-${userId}-${dateStr}.pdf`;
    this.logger.log(`Generando reporte para el archivo: ${fileName}`);

    const buffer = await this.pdfService.generarPdfPorUsuario(userInfo);

    if (!buffer || typeof buffer === 'boolean') {
      this.logger.error('Error al generar el buffer del PDF para S3/R2');
      perUserResults.push({
        userId,
        fileName,
        error: 'Error al generar el buffer del PDF para S3/R2',
      });
      return;
    }

    try {
      const nameS3 = crypto.randomBytes(16).toString('hex');
      const contentType = process.env.MIME_TYPE_PDF || 'application/pdf';

      await this.s3Service.uploadFile(buffer, contentType, nameS3);
      this.logger.log(`Archivo PDF subido a S3/R2 exitosamente: ${nameS3}`);
      perUserResults.push({ userId, fileName, error: null });
    } catch (error: any) {
      this.logger.error(
        'Error al subir archivo a S3/R2:',
        error?.message ?? String(error),
      );
      perUserResults.push({
        userId,
        fileName,
        error: `Error al subir archivo a S3/R2: ${error?.message ?? String(error)}`,
      });
    }
    return perUserResults;
  }
}
