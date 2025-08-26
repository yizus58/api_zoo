import { Controller, Get, Param, Query, ValidationPipe } from '@nestjs/common';
import { IndicatorsService } from '../services/indicators.services';

@Controller('indicadores')
export class IndicatorsController {
  constructor(private readonly indicatorService: IndicatorsService) {}

  @Get('query')
  async findAllQuery(@Query('search') search: string) {
    return this.indicatorService.findAllQuery(search);
  }

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

  @Get('porcentaje-comentarios-animales')
  async getPercentageOfCommentaryAnimals() {
    const id = null;
    return this.indicatorService.getAverageCommentBySpecies(id);
  }

  @Get('porcentaje-comentario-respuesta')
  async getPercentageOfResponseCommentary() {
    return this.indicatorService.getAverageComment();
  }

  @Get('reporte-animales')
  async animalsCreatedToDay() {
    return this.indicatorService.findAnimalsToDay();
  }
}
