import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { DEFAULT_TIMEZONE } from '../indicators/indicators.service';
import { UserReport } from './report.types';

export const PDF_MIME = 'application/pdf';

/** PDF summary of one employee's daily report. */
@Injectable()
export class PdfReportService {
  private readonly printer: PdfPrinter;

  constructor(private readonly config: ConfigService) {
    const dir = this.config.get<string>(
      'REPORT_FONTS_DIR',
      join(process.cwd(), 'fonts'),
    );
    this.printer = new PdfPrinter({
      Roboto: {
        normal: join(dir, 'Roboto-Regular.ttf'),
        bold: join(dir, 'Roboto-Medium.ttf'),
        italics: join(dir, 'Roboto-Italic.ttf'),
        bolditalics: join(dir, 'Roboto-MediumItalic.ttf'),
      },
    });
  }

  build(report: UserReport): Promise<Buffer> {
    const timeZone = this.config.get<string>('APP_TIMEZONE', DEFAULT_TIMEZONE);
    const formatDate = (date: Date) =>
      new Date(date).toLocaleString('es-CO', { timeZone, hour12: false });

    const rows =
      report.data.length > 0
        ? report.data.map((entry) => [
            entry.zona,
            entry.specie,
            entry.animal,
            entry.comentario.comentario,
            entry.comentario.autor,
            entry.comentario.fecha ? formatDate(entry.comentario.fecha) : '',
          ])
        : [
            [
              {
                text: 'Sin comentarios registrados',
                style: 'noData',
                colSpan: 6,
              },
              '',
              '',
              '',
              '',
              '',
            ],
          ];

    const definition: TDocumentDefinitions = {
      pageOrientation: 'landscape',
      pageMargins: [40, 60, 40, 60],
      defaultStyle: { fontSize: 9, font: 'Roboto' },
      content: [
        {
          text: 'Reporte de Animales Comentados',
          style: 'title',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
          text: `¡Hola ${report.email}! En este reporte encontrarás los animales a tu cargo que fueron comentados`,
          style: 'greeting',
          margin: [0, 0, 0, 20],
        },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', 'auto', '*', 'auto', 'auto'],
            body: [
              ['Zona', 'Especie', 'Animal', 'Comentario', 'Autor', 'Fecha'].map(
                (text) => ({
                  text,
                  style: 'tableHeader',
                }),
              ),
              ...rows,
            ],
          },
          layout: {
            fillColor: (rowIndex: number) =>
              rowIndex === 0
                ? '#4472C4'
                : rowIndex % 2 === 0
                  ? '#F2F2F2'
                  : null,
          },
        },
      ],
      styles: {
        title: { fontSize: 18, bold: true, color: '#2E4075' },
        greeting: { fontSize: 12, color: '#333333', italics: true },
        tableHeader: {
          bold: true,
          fontSize: 10,
          color: 'white',
          alignment: 'center',
        },
        noData: { fontSize: 10, italics: true, color: '#666666' },
      },
    };

    const document = this.printer.createPdfKitDocument(definition);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      document.end();
    });
  }
}
