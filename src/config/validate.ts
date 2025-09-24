import { Injectable } from '@nestjs/common';

@Injectable()
export class S3Validator {
  validateEnvS3(
    accountId: string,
    accessKey: string,
    secretKey: string,
    bucket: string,
  ) {
    switch (true) {
      case !accountId:
        throw new Error('R2_ACCOUNT_ID variable de entorno es requerida');
      case !accessKey:
        throw new Error(
          'R2_BUCKET_ACCESS_KEY variable de entorno es requerida',
        );
      case accessKey.trim() === '':
        throw new Error('R2_BUCKET_ACCESS_KEY no puede estar vacía');
      case accessKey.length < 10:
        throw new Error('R2_BUCKET_ACCESS_KEY parece ser inválida (muy corta)');

      case !secretKey:
        throw new Error(
          'R2_BUCKET_SECRET_KEY variable de entorno es requerida',
        );
      case secretKey.trim() === '':
        throw new Error('R2_BUCKET_SECRET_KEY no puede estar vacía');
      case secretKey.length < 20:
        throw new Error('R2_BUCKET_SECRET_KEY parece ser inválida (muy corta)');

      case !bucket:
        throw new Error('R2_BUCKET_NAME variable de entorno es requerida');
    }
  }
}
