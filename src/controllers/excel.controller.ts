import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ExcelService } from '../services/excel.service';

@Controller('excel')
export class ExcelController {
  constructor(private readonly excelService: ExcelService) {}

  @Get('comentarios-del-dia')
  async descargarExcelComentariosDelDia(
    @Query('formato') formato: string = 'buffer',
    @Query('archivo') nombreArchivo?: string,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const fileName =
        nombreArchivo ||
        `comentarios-animales-${new Date().toISOString().split('T')[0]}.xlsx`;

      if (formato === 'archivo' && nombreArchivo) {
        await this.excelService.generarExcelComentariosDelDia({
          filePath: nombreArchivo,
        });

        res?.json({
          message: 'Archivo Excel generado exitosamente',
          archivo: nombreArchivo,
        });
      } else {
        const buffer = await this.excelService.generarExcelComentariosDelDia();

        if (!buffer || typeof buffer === 'boolean') {
          throw new HttpException(
            'Error al generar el buffer del Excel',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        res?.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res?.setHeader(
          'Content-Disposition',
          `attachment; filename="${fileName}"`,
        );
        res?.setHeader('Content-Length', Buffer.byteLength(buffer));
        res?.send(buffer);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error interno al generar el Excel',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('comentarios-personalizado')
  async descargarExcelPersonalizado(
    @Query('usuarioId') usuarioId?: string,
    @Query('formato') formato: string = 'buffer',
    @Query('archivo') nombreArchivo?: string,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const fileName =
        nombreArchivo ||
        `comentarios-personalizados-${new Date().toISOString().split('T')[0]}.xlsx`;

      if (formato === 'archivo' && nombreArchivo) {
        await this.excelService.generarExcelComentariosDelDia({
          filePath: nombreArchivo,
        });

        res?.json({
          message: 'Archivo Excel personalizado generado exitosamente',
          archivo: nombreArchivo,
          usuarioId: usuarioId || 'todos',
        });
      } else {
        const buffer = await this.excelService.generarExcelComentariosDelDia();

        if (!buffer || typeof buffer === 'boolean') {
          throw new HttpException(
            'Error al generar el buffer del Excel',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        res?.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res?.setHeader(
          'Content-Disposition',
          `attachment; filename="${fileName}"`,
        );
        res?.setHeader('Content-Length', Buffer.byteLength(buffer));
        res?.send(buffer);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error interno al generar el Excel personalizado',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
