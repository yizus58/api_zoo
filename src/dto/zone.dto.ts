import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DataType } from 'sequelize-typescript';

export class ZoneDto {
  @ApiProperty({
    description: 'Nombre de la zona',
    example: 'Zona 1',
    type: DataType.STRING,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  nombre: string;
}
