import { ApiProperty } from '@nestjs/swagger';

class NameDto {
  @ApiProperty() nombre: string;
}

class EmailDto {
  @ApiProperty() email: string;
}

export class AnimalResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty() id_especie: string;
  @ApiProperty() id_user: string;
  @ApiProperty() fecha: Date;
}

export class AnimalDetailDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty() fecha: Date;
  @ApiProperty({ type: NameDto }) species: NameDto;
  @ApiProperty({ type: EmailDto, description: 'Empleado responsable' })
  userCreated: EmailDto;
}
