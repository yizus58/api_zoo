import { IsNotEmpty, IsString, MinLength, IsUUID } from 'class-validator';

export class SpeciesDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  nombre: string;

  @IsNotEmpty()
  @IsUUID()
  id_area: string;
}
