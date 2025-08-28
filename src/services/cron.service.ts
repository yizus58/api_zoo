import { Injectable, Logger } from '@nestjs/common';
import { IndicatorsService } from './indicators.services';
import { ExcelService } from './excel.service';
import { S3Service } from './s3.service';
import * as path from 'path';
import * as fs from 'fs';
import crypto from 'crypto';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly indicatorService: IndicatorsService,
    private readonly excelService: ExcelService,
    private readonly s3Service: S3Service,
  ) {}

  async executeDailyTask() {
    try {
      this.logger.log('Iniciando tarea diaria de generación de reportes...');
      const arrayErrors: any[] = [];

      const data = await this.indicatorService.animalsCommentPerDay();

      if (!data?.userAnimalComment || data.userAnimalComment.length === 0) {
        this.logger.warn('No hay comentarios para procesar hoy');
        return {
          success: false,
          message: 'No hay comentarios para procesar hoy',
          totalUsers: 0,
          totalComments: 0,
        };
      }

      for (const userInfo of data.userAnimalComment) {
        console.log('Generando reporte para el usuario:', userInfo);
        const data = [userInfo];
        const today = new Date();
        const userId = data[0].user.slice(0, 8);
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const fileName = `reporte-diario-comentarios-${userId}-${dateStr}.xlsx`;
        console.log('Generando reporte para el usuario:', fileName);

        const buffer = await this.excelService.generarExcelPorUsuario(userInfo);

        if (!buffer || typeof buffer === 'boolean') {
          console.log('ERROR al generar el buffer del Excel para S3');
          arrayErrors.push({ userId, error: 'Error al generar el buffer del Excel para S3' });
          continue;
        }

        let s3UploadResult = null;

        try {
          const nameS3 = crypto.randomBytes(16).toString('hex');
          const contentType =
            process.env.MIME_TYPE_EXCEL ||
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

          s3UploadResult = await this.s3Service.uploadFile(
            buffer as Buffer,
            contentType,
            nameS3,
          );
          this.logger.log(`Archivo subido a S3/R2 exitosamente: ${nameS3}`);
        } catch (error) {
          this.logger.error('Error al subir archivo a S3/R2:', error.message);
          arrayErrors.push({ userId, error: `Error al subir archivo a S3/R2: ${error.message}` });
        }
      }

      this.logger.log(
        `Total de usuarios procesados: ${data.userAnimalComment?.length || 0}`,
      );

      return {
        success: true,
        //fileName: fileName,
        totalUsers: data.userAnimalComment?.length || 0,
        totalComments: data.animalsComments?.length || 0,
        //s3Upload: s3UploadResult ? 'success' : 'failed',
      };
    } catch (error) {
      this.logger.error(
        'Error en la tarea diaria de generación de reportes:',
        error,
      );
      throw error;
    }
  }
}
