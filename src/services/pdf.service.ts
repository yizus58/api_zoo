import { Injectable } from '@nestjs/common';
import { IndicatorsService } from './indicators.services';
import PdfPrinter = require('pdfmake');

const fonts = {
  Roboto: {
    normal: 'fonts/Roboto-Regular.ttf',
    bold: 'fonts/Roboto-Medium.ttf',
    italics: 'fonts/Roboto-Italic.ttf',
    bolditalics: 'fonts/Roboto-MediumItalic.ttf',
  },
};

@Injectable()
export class PdfService {
  constructor(private readonly indicatorService: IndicatorsService) {}

  async generarPdfPorUsuario(
    data: any,
    opts: { filePath?: string } = {},
  ): Promise<Buffer> {
    const printer = new PdfPrinter(fonts);

    const items =
      data && typeof data === 'object' && Array.isArray(data) ? data : [data];

    if (items.length === 0) {
      throw new Error('generarPdfPorUsuario: data vacío o inválido');
    }

    // Procesar el primer item (se puede extender para múltiples usuarios)
    const item = items[0];
    const comentarios = item.data || [];

    // Mensaje de saludo
    const saludoText = `¡Hola ${item.email || 'Usuario desconocido'}! En este reporte encontraras los animales relacionados a ti que fueron comentados`;

    // Preparar filas de la tabla
    const tableBody: any[][] = [
      // Encabezados
      [
        { text: 'Zona', style: 'tableHeader' },
        { text: 'Especie', style: 'tableHeader' },
        { text: 'Animal', style: 'tableHeader' },
        { text: 'Comentario', style: 'tableHeader' },
        { text: 'Autor', style: 'tableHeader' },
        { text: 'Fecha', style: 'tableHeader' },
      ],
    ];

    // Agregar datos de comentarios
    if (comentarios.length > 0) {
      comentarios.forEach((comentarioData) => {
        tableBody.push([
          { text: comentarioData.zona || '' },
          { text: comentarioData.specie || '' },
          { text: comentarioData.animal || '' },
          { text: comentarioData.comentario?.comentario || '' },
          { text: comentarioData.comentario?.autor || '' },
          { 
            text: comentarioData.comentario?.fecha
              ? new Date(comentarioData.comentario.fecha).toLocaleDateString(
                  'es-ES',
                  {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  },
                )
              : ''
          },
        ]);
      });
    } else {
      tableBody.push([
        { text: 'Sin comentarios registrados', style: 'noData' },
        { text: '' },
        { text: '' },
        { text: '' },
        { text: '' },
        { text: '' },
      ]);
    }

    const docDefinition: any = {
      content: [
        // Título principal
        {
          text: 'Reporte de Animales Comentados',
          style: 'title',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },

        // Mensaje de saludo
        {
          text: saludoText,
          style: 'greeting',
          margin: [0, 0, 0, 20],
        },

        // Información del usuario
        {
          text: `Usuario: ${item.email || 'No especificado'}`,
          style: 'userInfo',
          margin: [0, 0, 0, 15],
        },

        // Tabla de comentarios
        {
          table: {
            headerRows: 1,
            widths: [
              'auto',
              'auto',
              'auto',
              '*',
              'auto',
              'auto',
            ],
            body: tableBody,
          },
          layout: {
            fillColor: function (rowIndex: number) {
              return rowIndex === 0
                ? '#4472C4'
                : rowIndex % 2 === 0
                  ? '#F2F2F2'
                  : null;
            },
          },
        },
      ],
      styles: {
        title: {
          fontSize: 18,
          bold: true,
          color: '#2E4075',
        },
        greeting: {
          fontSize: 12,
          color: '#333333',
          italics: true,
        },
        userInfo: {
          fontSize: 11,
          bold: true,
          color: '#4472C4',
        },
        tableHeader: {
          bold: true,
          fontSize: 10,
          color: 'white',
          alignment: 'center',
        },
        noData: {
          fontSize: 10,
          italics: true,
          color: '#666666',
        },
      },
      defaultStyle: {
        fontSize: 9,
        font: 'Roboto',
      },
      pageMargins: [40, 60, 40, 60],
      pageOrientation: 'landscape',
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      pdfDoc.on('data', (chunk) => {
        chunks.push(chunk);
      });

      pdfDoc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      pdfDoc.on('error', (err) => {
        reject(err);
      });

      pdfDoc.end();
    });
  }
}
