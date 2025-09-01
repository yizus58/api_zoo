import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  UseGuards,
  Get,
  Request,
  Put,
  Param,
  Delete,
} from '@nestjs/common';
import { SpeciesService } from '../services/species.service';
import { SpeciesDto } from '../dto/species.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../types/user.types';
import { ApiResponse } from '@nestjs/swagger';
import { SpeciesResponseDto } from '../dto/response.dto';

@Controller('especies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  @ApiResponse({
    status: 201,
    description: 'Especie creada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'El area especificada no existe',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya hay una especie existente con ese nombre',
  })
  @Post()
  @Roles(UserRole.EMPLEADO)
  async createSpecies(@Body(ValidationPipe) speciesDto: SpeciesDto) {
    return await this.speciesService.createSpecies(speciesDto);
  }

  @ApiResponse({
    status: 200,
    description: 'Especie actualizada correctamente',
  })
  @ApiResponse({
    status: 404,
    description:
      'El area especificada no existe o la especie especificada no existe',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya hay una especie existente con ese nombre',
  })
  @Put(':id')
  @Roles(UserRole.EMPLEADO)
  async updateSpecies(
    @Request() req,
    @Param('id') id: string,
    @Body(ValidationPipe) speciesDto: SpeciesDto,
  ) {
    return await this.speciesService.updateSpecies(id, speciesDto);
  }

  @ApiResponse({
    status: 200,
    description: 'Especie eliminada correctamente',
  })
  @ApiResponse({
    status: 404,
    description: 'La especie especificada no existe',
  })
  @ApiResponse({
    status: 409,
    description: 'No se puede eliminar la especie, hay animales relacionados',
  })
  @Delete(':id')
  @Roles(UserRole.EMPLEADO)
  async deleteSpecies(@Param('id') id: string) {
    return await this.speciesService.deleteSpecies(id);
  }

  @ApiResponse({
    status: 200,
    description: 'Array de especies',
    type: [SpeciesResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'No hay especies registradas',
  })
  @Get()
  async getAllSpecies() {
    return this.speciesService.getAllSpecies();
  }

  @ApiResponse({
    status: 200,
    description: 'Array de especie especificada',
    type: [SpeciesResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'La especie especificada no existe',
  })
  @Get(':id')
  async getSpeciesById(@Param('id') id: string) {
    return this.speciesService.getSpeciesById(id);
  }
}
