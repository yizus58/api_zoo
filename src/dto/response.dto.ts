import { ApiProperty } from '@nestjs/swagger';

export class AnimalResponseDto {
  @ApiProperty({
    example: '9d678bb6-9312-41b9-b6af-3a01ce0a91bc',
    description: 'ID único del animal',
  })
  id: string;

  @ApiProperty({
    example: 'Paul Björnsdóttir',
    description: 'Nombre del animal',
  })
  nombre: string;
}

export class SpeciesResponseDto {
  @ApiProperty({
    example: '353c49f6-184c-4961-8a3b-323aa4254688',
    description: 'ID único de la especie',
  })
  id: string;

  @ApiProperty({
    example: 'Chinese Alligator neque',
    description: 'Nombre de la especie',
  })
  nombre: string;

  @ApiProperty({
    type: [AnimalResponseDto],
    description: 'Lista de animales de esta especie',
  })
  animals: AnimalResponseDto[];
}

export class ResponseDto {
  @ApiProperty({
    example: '87d79ff2-bb33-43d2-9686-a85c202a49d7',
    description: 'ID único de la zona',
  })
  id: string;

  @ApiProperty({
    example: 'eos Upton - Reichert',
    description: 'Nombre de la zona',
  })
  nombre: string;

  @ApiProperty({
    type: [SpeciesResponseDto],
    description: 'Lista de especies en esta zona',
  })
  species: SpeciesResponseDto[];
}
