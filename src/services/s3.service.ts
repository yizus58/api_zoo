import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import { S3Validator } from '../config/validate';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly s3Validator: S3Validator,
  ) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKey = this.configService.get<string>('R2_BUCKET_ACCESS_KEY');
    const secretKey = this.configService.get<string>('R2_BUCKET_SECRET_KEY');
    const bucketName = this.configService.get<string>('R2_BUCKET_NAME');
    const region = this.configService.get<string>('R2_BUCKET_REGION');

    this.s3Validator.validateEnvS3(accountId, accessKey, secretKey, bucketName);

    const accountIdRegex = /^[a-f0-9]{32}$/i;
    if (!accountIdRegex.test(accountId)) {
      this.logger.warn(
        'R2_ACCOUNT_ID no parece tener el formato esperado de Cloudflare R2',
      );
    }

    this.s3Client = new S3Client({
      region: region,
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });

    this.logger.log('Cliente S3 configurado exitosamente');
  }

  async uploadFile(
    buffer: Buffer,
    contentType: string,
    fileName: string,
  ): Promise<{ Key: string }> {
    await this.getFile(fileName);

    if (!Buffer.isBuffer(buffer)) {
      throw new Error('El parámetro buffer debe ser un Buffer válido');
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.configService.get<string>('R2_BUCKET_NAME'),
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      this.logger.log(`Archivo subido exitosamente: ${fileName}`);
      return { Key: fileName };
    } catch (error) {
      this.logger.error(
        `Error subiendo archivo "${fileName}": ${error.message}`,
      );
      throw error;
    }
  }

  async getFile(filename: string): Promise<{ key: string; exists: boolean }> {
    try {
      const commandFind = new GetObjectCommand({
        Bucket: this.configService.get<string>('R2_BUCKET_NAME'),
        Key: filename,
      });

      await this.s3Client.send(commandFind);
      return {
        key: filename,
        exists: true,
      };
    } catch (error) {
      if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
        return {
          key: filename,
          exists: false,
        };
      }

      this.logger.error(
        `Error verificando existencia del archivo: ${error.message}`,
      );
      throw error;
    }
  }

  async deleteFile(filename: string): Promise<any> {
    try {
      const bucketName = this.configService.get<string>('R2_BUCKET_NAME');

      if (!bucketName) {
        throw new Error(
          'R2_BUCKET_NAME variable de entorno no está configurada',
        );
      }

      if (!filename) {
        throw new Error(
          'El nombre del archivo es requerido para la eliminación',
        );
      }

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: filename,
      });

      const result = await this.s3Client.send(command);
      this.logger.log(`Archivo eliminado exitosamente: ${filename}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error eliminando archivo de Cloudflare R2: ${error.message}`,
      );
      throw error;
    }
  }

  generateRandomFileName(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
