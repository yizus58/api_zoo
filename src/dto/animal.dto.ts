import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsUUID,
  IsOptional,
  IsDate,
} from 'class-validator';

export class AnimalDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  nombre: string;

  @IsNotEmpty()
  @IsUUID()
  id_especie: string;

  @IsOptional()
  @IsDate()
  fecha?: Date;
}
