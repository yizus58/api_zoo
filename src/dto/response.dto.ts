import { ApiProperty } from '@nestjs/swagger';

export class UserLoginResponseDto {
  @ApiProperty({
    description: 'Token de autenticación JWT',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  })
  token: string;

  @ApiProperty({
    description: 'ID único del usuario',
    example: '123e4567-e89b-12d3-a456-426655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'John.Doe@mail.com',
  })
  email: string;

  @ApiProperty({
    description: 'Rol del usuario',
    example: 'ADMIN | USUARIO | EMPLEADO',
  })
  rol: string;
}

export class UserCreateResponseDto {
  @ApiProperty({
    description: 'ID único del usuario',
    example: '123e4567-e89b-12d3-a456-426655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'John.Doe@mail.com',
  })
  email: string;

  @ApiProperty({
    description: 'Rol del usuario',
    example: 'ADMIN | USUARIO | EMPLEADO',
  })
  rol: string;
}

export class UserResponseDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'John.Doe@mail.com',
  })
  email: string;
}

export class AnimalResponseDto {
  @ApiProperty({
    description: 'ID único del animal',
    example: '9d678bb6-9312-41b9-b6af-3a01ce0a91bc',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del animal',
    example: 'Paul Björnsdóttir',
  })
  nombre: string;

  @ApiProperty({
    type: [UserResponseDto],
    description: 'Usuarios que tienen acceso a este animal',
  })
  usuarios: UserResponseDto[];
}

export class SpeciesResponseDto {
  @ApiProperty({
    description: 'ID único de la especie',
    example: '353c49f6-184c-4961-8a3b-323aa4254688',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre de la especie',
    example: 'Chinese Alligator neque',
  })
  nombre: string;

  @ApiProperty({
    type: [AnimalResponseDto],
    description: 'Lista de animales de esta especie',
  })
  animals: AnimalResponseDto[];
}

export class ZoneResponseDto {
  @ApiProperty({
    description: 'ID único de la zona',
    example: '87d79ff2-bb33-43d2-9686-a85c202a49d7',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre de la zona',
    example: 'eos Upton - Reichert',
  })
  nombre: string;

  @ApiProperty({
    type: [SpeciesResponseDto],
    description: 'Lista de especies en esta zona',
  })
  species: SpeciesResponseDto[];
}
