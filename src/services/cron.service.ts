import { Injectable, Logger } from '@nestjs/common';
import { IndicatorsService } from './indicators.services';
import { ExcelService } from './excel.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly indicatorService: IndicatorsService,
    private readonly excelService: ExcelService,
  ) {}

  async executeDailyTask() {
    try {
      this.logger.log('Iniciando tarea diaria de generación de reportes...');

      const data = await this.indicatorService.animalsCommentPerDay();

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const fileName = `reporte-comentarios-animales-${dateStr}.xlsx`;

      // Crear directorio si no existe
      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filePath = path.join(reportsDir, fileName);

      await this.excelService.generarExcelComentariosDelDia({
        filePath: filePath,
      });

      this.logger.log(`Reporte Excel generado exitosamente: ${filePath}`);
      this.logger.log(
        `Total de usuarios procesados: ${data.userAnimalComment?.length || 0}`,
      );

      return {
        success: true,
        fileName: fileName,
        filePath: filePath,
        totalUsers: data.userAnimalComment?.length || 0,
        totalComments: data.animalsComments?.length || 0,
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
