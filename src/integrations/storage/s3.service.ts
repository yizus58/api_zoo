import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';

const REQUIRED = [
  'R2_ACCOUNT_ID',
  'R2_BUCKET_ACCESS_KEY',
  'R2_BUCKET_SECRET_KEY',
  'R2_BUCKET_NAME',
] as const;

/**
 * Cloudflare R2 (S3 compatible) storage for the report attachments. The client is created on
 * first use, so the API starts (and serves every endpoint) without storage settings; only
 * the daily report needs them, and it fails with a clear message if they are missing.
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  /** Uploads under a new random key and returns it. */
  async upload(buffer: Buffer, contentType: string): Promise<string> {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error('El archivo a subir está vacío');
    }
    const key = randomBytes(16).toString('hex');
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.bucket(),
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    this.logger.log(`Archivo subido: ${key}`);
    return key;
  }

  async delete(key: string): Promise<void> {
    await this.getClient().send(
      new DeleteObjectCommand({ Bucket: this.bucket(), Key: key }),
    );
  }

  private bucket(): string {
    return this.config.getOrThrow<string>('R2_BUCKET_NAME');
  }

  private getClient(): S3Client {
    if (this.client) {
      return this.client;
    }
    const missing = REQUIRED.filter(
      (key) => !this.config.get<string>(key)?.trim(),
    );
    if (missing.length > 0) {
      throw new Error(
        `Faltan variables de almacenamiento: ${missing.join(', ')}`,
      );
    }
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    this.client = new S3Client({
      region: this.config.get<string>('R2_BUCKET_REGION', 'auto'),
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.get<string>('R2_BUCKET_ACCESS_KEY'),
        secretAccessKey: this.config.get<string>('R2_BUCKET_SECRET_KEY'),
      },
      forcePathStyle: true,
    });
    return this.client;
  }
}
