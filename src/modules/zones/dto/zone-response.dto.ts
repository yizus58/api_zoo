import { ApiProperty } from '@nestjs/swagger';

export class AnimalSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
}

export class SpeciesWithAnimalsDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ type: [AnimalSummaryDto] }) animals: AnimalSummaryDto[];
}

export class ZoneResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
}

export class ZoneDetailDto extends ZoneResponseDto {
  @ApiProperty({ type: [SpeciesWithAnimalsDto] })
  species: SpeciesWithAnimalsDto[];
}
