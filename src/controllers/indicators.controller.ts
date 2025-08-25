import {
  Controller,
  Get,
  Param,
  ValidationPipe
} from '@nestjs/common';
import { IndicatorsService } from '../services/indicators.services';

@Controller('indicadores')
export class IndicatorsController {
  constructor(private readonly indicatorService: IndicatorsService) {}

  @Get('total-animales')
  async totalAnimalsByArea() {
    const id = null;
    return this.indicatorService.getTotalAnimalsByArea(id);
  }

  @Get('total-animales/:id')
  async getTotalAnimalsById(@Param('id', new ValidationPipe()) id: string) {
    return this.indicatorService.getTotalAnimalsByArea(id);
  }

  @Get('total-animales-especies')
  async getTotalAnimalsSpecies() {
    const id = null;
    return this.indicatorService.getTotalAnimalsSpecies(id);
  }

  @Get('total-animales-especies/:id')
  async getTotalAnimalsSpeciesById(
    @Param('id', new ValidationPipe()) id: string,
  ) {
    return this.indicatorService.getTotalAnimalsSpecies(id);
  }
}
