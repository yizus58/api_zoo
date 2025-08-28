import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { IndicatorsService } from './indicators.services';

export interface ExcelGenerationOptions {
  filePath?: string;
}

@Injectable()
export class ExcelService {
  constructor(private readonly indicatorsService: IndicatorsService) {}

  async generarExcelPorUsuario(
    data,
    opts: ExcelGenerationOptions = {},
  ): Promise<Buffer | boolean> {
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.calcProperties.fullCalcOnLoad = true;

    const items =
      data && typeof data === 'object' && Array.isArray(data) ? data : [data];

    if (items.length === 0) {
      throw new HttpException(
        'generarExcelPorUsuario: data vacío o inválido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const usedSheetNames = new Set<string>();

    for (const item of items) {
      const baseSheetName = (item.email || 'usuario').substring(0, 25);
      let sheetName = baseSheetName;
      let counter = 1;

      // Asegurar que el nombre de la hoja sea único
      while (usedSheetNames.has(sheetName)) {
        const suffix = `_${counter}`;
        const maxLength = 31 - suffix.length;
        sheetName = baseSheetName.substring(0, maxLength) + suffix;
        counter++;
      }

      usedSheetNames.add(sheetName);
      const ws = workbook.addWorksheet(sheetName);

      const headerStyle = { bold: true };
      const dateFormat = 'dd/mm/yyyy hh:mm:ss';

      // Título principal
      ws.mergeCells('A1:I1');
      ws.getCell('A1').value =
        `Usuario: ${item.email || ''} | Reporte Animales Comentados`;
      ws.getCell('A1').font = { bold: true, size: 12 };

      // Espacio
      ws.addRow([]);

      // Encabezados
      ws.addRow([
        'Zona',
        'Especie',
        'Animal',
        'Comentario',
        'Autor',
        'Fecha',
        'Respuesta',
        'Autor Respuesta',
        'Fecha Respuesta',
      ]);

      ws.getRow(3).font = headerStyle;
      ws.getRow(3).alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(3).height = 18;

      let rowIndex = 4;

      const comentarios = item.data || [];

      comentarios.forEach((comentarioData) => {
        ws.addRow([
          comentarioData.zona || '',
          comentarioData.specie || '',
          comentarioData.animal || '',
          comentarioData.comentario?.comentario || '',
          comentarioData.comentario?.autor || '',
          comentarioData.comentario?.fecha || '',
          comentarioData.comentario?.respuesta?.comentario || '',
          comentarioData.comentario?.respuesta?.autor || '',
          comentarioData.comentario?.respuesta?.fecha || '',
        ]);

        // Formatear fechas
        if (comentarioData.comentario?.fecha) {
          ws.getCell(`F${rowIndex}`).numFmt = dateFormat;
        }
        if (comentarioData.comentario?.respuesta?.fecha) {
          ws.getCell(`I${rowIndex}`).numFmt = dateFormat;
        }

        rowIndex++;
      });

      // Si no hay datos
      if (comentarios.length === 0) {
        ws.addRow([]);
        ws.addRow(['Sin comentarios registrados']);
      }

      // Configurar ancho de columnas
      const colWidths = [15, 15, 15, 25, 15, 18, 25, 15, 18];
      colWidths.forEach((w, idx) => (ws.getColumn(idx + 1).width = w));

      // Agregar filtros
      if (comentarios.length > 0) {
        ws.autoFilter = {
          from: { row: 3, column: 1 },
          to: { row: 3, column: 9 },
        };
      }
    }

    if (opts.filePath) {
      await workbook.xlsx.writeFile(opts.filePath);
      return false;
    } else {
      return Buffer.from(await workbook.xlsx.writeBuffer());
    }
  }

  async generarExcelComentariosDelDia(
    opts: ExcelGenerationOptions = {},
  ): Promise<Buffer | boolean> {
    try {
      const data = await this.indicatorsService.animalsCommentPerDay();

      if (!data) {
        throw new HttpException(
          'No se pudieron obtener los datos de comentarios del día',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const { userAnimalComment } = data;

      if (!userAnimalComment || userAnimalComment.length === 0) {
        throw new HttpException(
          'No hay comentarios para el día de hoy',
          HttpStatus.NOT_FOUND,
        );
      }

      return await this.generarExcelPorUsuario(userAnimalComment, opts);
    } catch (error) {
      console.error('Error en generarExcelComentariosDelDia:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al generar el reporte de Excel: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
