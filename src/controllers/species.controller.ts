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

@Controller('especies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  @Post()
  @Roles(UserRole.EMPLEADO)
  async createSpecies(@Body(ValidationPipe) speciesDto: SpeciesDto) {
    return await this.speciesService.createSpecies(speciesDto);
  }

  @Put(':id')
  @Roles(UserRole.EMPLEADO)
  async updateSpecies(
    @Request() req,
    @Param('id') id: string,
    @Body(ValidationPipe) speciesDto: SpeciesDto,
  ) {
    return await this.speciesService.updateSpecies(id, speciesDto);
  }

  @Delete(':id')
  @Roles(UserRole.EMPLEADO)
  async deleteSpecies(@Param('id') id: string) {
    return await this.speciesService.deleteSpecies(id);
  }

  @Get('all')
  async getAllSpecies() {
    return this.speciesService.getAllSpecies();
  }

  @Get(':id')
  async getSpeciesById(@Param('id') id: string) {
    return this.speciesService.getSpeciesById(id);
  }
}
