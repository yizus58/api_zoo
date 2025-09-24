import { Module } from '@nestjs/common';
import { S3Service } from '../services/s3.service';
import { ConfigModule } from '@nestjs/config';
import { S3Validator } from '../config/validate';

@Module({
  imports: [ConfigModule],
  providers: [S3Service, S3Validator],
  exports: [S3Service],
})
export class S3Module {}
