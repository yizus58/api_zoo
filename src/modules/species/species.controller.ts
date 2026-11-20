import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/user-role';
import {
  SpeciesDetailDto,
  SpeciesResponseDto,
} from './dto/species-response.dto';
import { SpeciesDto } from './dto/species.dto';
import { Species } from './species.model';
import { SpeciesService } from './species.service';

@ApiTags('especies')
@ApiBearerAuth()
@Controller('especies')
export class SpeciesController {
  constructor(private readonly species: SpeciesService) {}

  @Post()
  @Roles(UserRole.EMPLEADO)
  @ApiCreatedResponse({ type: SpeciesResponseDto })
  @ApiNotFoundResponse({ description: 'El área especificada no existe' })
  @ApiConflictResponse({
    description: 'Ya hay una especie existente con ese nombre',
  })
  create(@Body() dto: SpeciesDto): Promise<Species> {
    return this.species.create(dto);
  }

  @Get()
  @ApiOkResponse({
    type: [SpeciesDetailDto],
    description: '[] si no hay especies',
  })
  findAll(): Promise<Species[]> {
    return this.species.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: SpeciesDetailDto })
  @ApiNotFoundResponse({ description: 'La especie especificada no existe' })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<Species> {
    return this.species.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.EMPLEADO)
  @ApiOkResponse({ type: SpeciesResponseDto })
  @ApiNotFoundResponse({ description: 'La especie o el área no existen' })
  @ApiConflictResponse({
    description: 'Ya hay una especie existente con ese nombre',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SpeciesDto,
  ): Promise<Species> {
    return this.species.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.EMPLEADO)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Especie eliminada' })
  @ApiNotFoundResponse({ description: 'La especie especificada no existe' })
  @ApiConflictResponse({ description: 'Hay animales relacionados' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.species.remove(id);
  }
}
