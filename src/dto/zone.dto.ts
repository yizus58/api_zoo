import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ZoneDto {
  @ApiProperty({
    description: 'Nombre de la zona',
    example: 'Zona 1',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  nombre: string;
}
