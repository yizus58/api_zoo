import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { UserReport } from './report.types';

export const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const HEADERS = [
  'Zona',
  'Especie',
  'Animal',
  'Comentario',
  'Autor',
  'Fecha',
  'Respuesta',
  'Autor Respuesta',
  'Fecha Respuesta',
];
const WIDTHS = [15, 15, 15, 40, 25, 20, 40, 25, 20];
const DATE_FORMAT = 'dd/mm/yyyy hh:mm:ss';

/** Excel detail of one employee's daily report. */
@Injectable()
export class ExcelReportService {
  async build(report: UserReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(sheetName(report.email));

    sheet.mergeCells('A1:I1');
    sheet.getCell('A1').value =
      `Usuario: ${report.email} | Reporte Animales Comentados`;
    sheet.getCell('A1').font = { bold: true, size: 12 };
    sheet.addRow([]);

    const header = sheet.addRow(HEADERS);
    header.font = { bold: true };
    header.alignment = { vertical: 'middle', horizontal: 'center' };

    for (const entry of report.data) {
      const row = sheet.addRow([
        entry.zona,
        entry.specie,
        entry.animal,
        entry.comentario.comentario,
        entry.comentario.autor,
        entry.comentario.fecha ?? '',
        entry.comentario.respuesta?.comentario ?? '',
        entry.comentario.respuesta?.autor ?? '',
        entry.comentario.respuesta?.fecha ?? '',
      ]);
      row.getCell(6).numFmt = DATE_FORMAT;
      row.getCell(9).numFmt = DATE_FORMAT;
    }

    if (report.data.length === 0) {
      sheet.addRow(['Sin comentarios registrados']);
    } else {
      sheet.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3, column: 9 },
      };
    }
    WIDTHS.forEach(
      (width, index) => (sheet.getColumn(index + 1).width = width),
    );

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}

/** Excel sheet names: at most 31 characters and none of : \ / ? * [ ]. */
export function sheetName(email: string): string {
  return (email || 'usuario').replace(/[:\\/?*[\]]/g, '_').substring(0, 31);
}
