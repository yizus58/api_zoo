import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Only the text can change; the animal and the thread stay as they were. */
export class UpdateCommentDto {
  @ApiProperty({ example: 'Texto corregido del comentario' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  comentario: string;
}
