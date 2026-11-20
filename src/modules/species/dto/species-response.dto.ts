import { ApiProperty } from '@nestjs/swagger';
import { AnimalSummaryDto } from '../../zones/dto/zone-response.dto';

export class SpeciesResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty() id_area: string;
}

export class SpeciesDetailDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ type: [AnimalSummaryDto] }) animals: AnimalSummaryDto[];
}
