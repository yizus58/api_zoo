import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsUUID,
  IsOptional,
  IsDate,
} from 'class-validator';

export class CommentDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  comentario: string;

  @IsNotEmpty()
  @IsUUID()
  id_animal: string;

  @IsOptional()
  @IsUUID()
  id_comentario_principal?: string;

  @IsOptional()
  @IsDate()
  fecha_creacion?: Date;
}
