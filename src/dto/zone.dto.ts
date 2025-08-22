import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ZoneDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  name: string;
}
