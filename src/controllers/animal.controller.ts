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
import { AnimalService } from '../services/animal.service';
import { AnimalDto } from '../dto/animal.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../types/user.types';

@Controller('animales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnimalController {
  constructor(private readonly animalService: AnimalService) {}

  @Post()
  @Roles(UserRole.EMPLEADO)
  async createAnimalWithUser(
    @Request() req,
    @Body(ValidationPipe) animalDto: AnimalDto,
  ) {
    return await this.animalService.createAnimal(req.user.id, animalDto);
  }

  @Put(':id')
  @Roles(UserRole.EMPLEADO)
  async updateAnimal(
    @Request() req,
    @Param('id') id: string,
    @Body(ValidationPipe) animalDto: AnimalDto,
  ) {
    return await this.animalService.updateAnimal(id, req.user.id, animalDto);
  }

  @Delete(':id')
  @Roles(UserRole.EMPLEADO)
  async deleteAnimal(@Param('id') id: string) {
    return await this.animalService.deleteAnimal(id);
  }

  @Get('all')
  async getAllAnimals() {
    return this.animalService.getAllAnimals();
  }

  @Get(':id')
  async getAnimalById(@Param('id') id: string) {
    return this.animalService.getAnimalById(id);
  }
}
