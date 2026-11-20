import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Que hermoso león, está muy activo hoy' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  comentario: string;

  @ApiProperty({ description: 'Animal comentado' })
  @IsUUID()
  id_animal: string;

  @ApiPropertyOptional({
    description: 'Comentario principal que se responde (un solo nivel)',
  })
  @IsOptional()
  @IsUUID()
  id_comentario_principal?: string;
}
