import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** The registration date and the responsible user are set by the server. */
export class AnimalDto {
  @ApiProperty({ example: 'Leon' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  nombre: string;

  @ApiProperty({
    description: 'ID de la especie',
    example: 'eab3b67f-a18e-4e2b-b675-9e0cbe7f5bc6',
  })
  @IsUUID()
  id_especie: string;
}
