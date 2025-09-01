import { IsNotEmpty, IsString, MinLength, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DataType } from 'sequelize-typescript';

export class SpeciesDto {
  @ApiProperty({
    description: 'Nombre de la especie',
    example: 'crustáceos',
    type: DataType.STRING,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  nombre: string;

  @ApiProperty({
    description: 'ID de la zona que va a pertenecer',
    example: 'eab3b67f-a18e-4e2b-b675-9e0cbe7f5bc6',
    type: DataType.UUID,
  })
  @IsNotEmpty()
  @IsUUID()
  id_area: string;
}
