import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { IndicatorsService } from './indicators.services';

export interface ExcelGenerationOptions {
  filePath?: string;
}

export interface CommentExcelData {
  zona: string;
  specie: string;
  animal: string;
  comentario: {
    id: string;
    comentario: string;
    autor: string;
    fecha: Date;
    respuesta: {
      id: string;
      comentario: string;
      autor: string;
      fecha: Date;
    };
  };
}

export interface UserExcelData {
  user: string;
  email: string;
  data: CommentExcelData[];
}

@Injectable()
export class ExcelService {
  constructor(private readonly indicatorsService: IndicatorsService) {}

  async generarExcelPorUsuario(
    data: UserExcelData[],
    opts: ExcelGenerationOptions = {},
  ): Promise<any> {
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.calcProperties.fullCalcOnLoad = true;

    const validaArray = Array.isArray(data) ? data : [];
    const validObject =
      data && typeof data === 'object' && Array.isArray(data) ? data : [];
    const items = [...validaArray, ...validObject];

    if (items.length === 0) {
      throw new HttpException(
        'generarExcelPorUsuario: data vacío o inválido',
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const item of items) {
      const sheetName = (item.email || 'usuario').substring(0, 31);
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
      return await workbook.xlsx.writeBuffer();
    }
  }

  async generarExcelComentariosDelDia(
    opts: ExcelGenerationOptions = {},
  ): Promise<any> {
    try {
      const { userAnimalComment } =
        await this.indicatorsService.animalsCommentPerDay();

      if (!userAnimalComment || userAnimalComment.length === 0) {
        throw new HttpException(
          'No hay comentarios para el día de hoy',
          HttpStatus.NOT_FOUND,
        );
      }

      return await this.generarExcelPorUsuario(userAnimalComment, opts);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al generar el reporte de Excel',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
