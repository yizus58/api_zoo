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
import { ZoneService } from '../services/zone.service';
import { ZoneDto } from '../dto/zone.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../types/user.types';

@Controller('areas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async createZone(@Body(ValidationPipe) zoneDto: ZoneDto) {
    return await this.zoneService.createArea(zoneDto);
  }

  @Get()
  async getAllZones() {
    return this.zoneService.getAllAreas();
  }

  @Get(':id')
  async getZoneById(@Request() req, @Param('id') id: string) {
    return await this.zoneService.getAreaById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async updateZone(
    @Request() req,
    @Param('id') id: string,
    @Body(ValidationPipe) zoneDto: ZoneDto,
  ) {
    return await this.zoneService.updateArea(zoneDto, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async deleteZone(@Request() req, @Param('id') id: string) {
    return await this.zoneService.deleteArea(id);
  }
}
