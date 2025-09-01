import {
  Controller,
  Post,
  Put,
  Body,
  ValidationPipe,
  UseGuards,
  Get,
  Request,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ZoneDto } from '../dto/zone.dto';
import { ResponseDto } from '../dto/response.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { ZoneService } from '../services/zone.service';
import { UserRole } from '../types/user.types';

@Controller('areas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

  @ApiResponse({
    status: 201,
    description: 'Zona creada exitosamente',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya hay una zona existente con ese nombre',
  })
  @ApiResponse({
    status: 500,
    description: 'No se pudo crear la zona',
  })
  @Post()
  @Roles(UserRole.ADMIN)
  async createZone(@Body(ValidationPipe) zoneDto: ZoneDto) {
    return await this.zoneService.createArea(zoneDto);
  }

  @ApiResponse({
    status: 200,
    description: 'Array de zonas',
    type: [ResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró la zona',
  })
  @ApiResponse({
    status: 500,
    description: 'Error al obtener las zonas',
  })
  @Get()
  async getAllZones() {
    return this.zoneService.getAllAreas();
  }

  @ApiResponse({
    status: 200,
    description: 'Array de zonas',
    type: [ResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró la zona',
  })
  @ApiResponse({
    status: 500,
    description: 'Error al obtener las zonas',
  })
  @Get(':id')
  async getZoneById(@Request() req, @Param('id') id: string) {
    return await this.zoneService.getAreaById(id);
  }

  @ApiResponse({
    status: 200,
    description: 'Zona actualizada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró la zona',
  })
  @Put(':id')
  @Roles(UserRole.ADMIN)
  async updateZone(
    @Request() req,
    @Param('id') id: string,
    @Body(ValidationPipe) zoneDto: ZoneDto,
  ) {
    return await this.zoneService.updateArea(zoneDto, id);
  }

  @ApiResponse({
    status: 200,
    description: 'Zona eliminada con éxito',
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró la zona especifica',
  })
  @ApiResponse({
    status: 409,
    description: 'No se puede eliminar la zona ya que contiene especies',
  })
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async deleteZone(@Request() req, @Param('id') id: string) {
    return await this.zoneService.deleteArea(id);
  }
}
