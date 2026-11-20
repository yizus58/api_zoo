import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SearchQueryDto } from './dto/search-query.dto';
import { IndicatorsService } from './indicators.service';

@ApiTags('indicadores')
@ApiBearerAuth()
@Controller('indicadores')
export class IndicatorsController {
  constructor(private readonly indicators: IndicatorsService) {}

  @Get('query')
  @ApiOkResponse({
    description: 'Coincidencias por categoría ([] en las vacías)',
  })
  @ApiBadRequestResponse({ description: 'search es obligatorio' })
  search(@Query() query: SearchQueryDto) {
    return this.indicators.search(query.search);
  }

  @Get('total-animales')
  @ApiOkResponse({ description: 'Animales por zona ([] si no hay zonas)' })
  totalAnimalsByZone() {
    return this.indicators.totalAnimalsByZone();
  }

  @Get('total-animales/:id')
  @ApiNotFoundResponse({ description: 'No se encontró la zona especificada' })
  totalAnimalsInZone(@Param('id', ParseUUIDPipe) id: string) {
    return this.indicators.totalAnimalsByZone(id);
  }

  @Get('total-animales-especies')
  @ApiOkResponse({
    description: 'Animales por especie ([] si no hay especies)',
  })
  totalAnimalsBySpecies() {
    return this.indicators.totalAnimalsBySpecies();
  }

  @Get('total-animales-especies/:id')
  @ApiNotFoundResponse({ description: 'La especie especificada no existe' })
  totalAnimalsInSpecies(@Param('id', ParseUUIDPipe) id: string) {
    return this.indicators.totalAnimalsBySpecies(id);
  }

  @Get('porcentaje-comentarios-animales')
  commentShareByAnimal() {
    return this.indicators.commentShareByAnimal();
  }

  @Get('porcentaje-comentario-respuesta')
  replyRate() {
    return this.indicators.replyRate();
  }

  @Get('reporte-animales')
  animalsRegisteredToday() {
    return this.indicators.animalsRegisteredToday();
  }
}
