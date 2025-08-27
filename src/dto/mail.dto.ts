import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class MailDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  recipients: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  subject: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  html: string;
}
