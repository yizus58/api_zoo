import { IsNotEmpty, IsString, MinLength, IsUUID } from 'class-validator';

export class AnimalDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  nombre: string;

  @IsNotEmpty()
  @IsUUID()
  id_especie: string;
}
