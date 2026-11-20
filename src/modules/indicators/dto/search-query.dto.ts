import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({
    description: 'Texto a buscar en zonas, especies, animales y comentarios',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'search es obligatorio' })
  @IsNotEmpty({ message: 'search es obligatorio' })
  @MaxLength(100)
  search: string;
}
