import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsUUID,
  IsOptional,
  IsDate,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DataType } from 'sequelize-typescript';

export class AnimalDto {
  @ApiProperty({
    description: 'Nombre del animal',
    example: 'Leon',
    type: DataType.STRING,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  nombre: string;

  @ApiProperty({
    description: 'ID de la especie',
    example: 'eab3b67f-a18e-4e2b-b675-9e0cbe7f5bc6',
    type: DataType.UUID,
  })
  @IsNotEmpty()
  @IsUUID()
  id_especie: string;

  @IsOptional()
  @IsDate()
  fecha?: Date;
}
