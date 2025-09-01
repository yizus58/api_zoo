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
import { ApiResponse } from '@nestjs/swagger';
import { AnimalResponseDto } from '../dto/response.dto';

@Controller('animales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnimalController {
  constructor(private readonly animalService: AnimalService) {}

  @ApiResponse({
    status: 201,
    description: 'Animal creado correctamente',
  })
  @ApiResponse({
    status: 404,
    description: 'La especie especificada no existe',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya hay un animal existente con ese nombre',
  })
  @Post()
  @Roles(UserRole.EMPLEADO)
  async createAnimalWithUser(
    @Request() req,
    @Body(ValidationPipe) animalDto: AnimalDto,
  ) {
    return await this.animalService.createAnimal(req.user.id, animalDto);
  }

  @ApiResponse({
    status: 200,
    description: 'Animal actualizado correctamente',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para editar este animal',
  })
  @ApiResponse({
    status: 404,
    description:
      'El animal especificado no existe o La especie especificada no existe',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya hay un animal existente con ese nombre',
  })
  @Put(':id')
  @Roles(UserRole.EMPLEADO)
  async updateAnimal(
    @Request() req,
    @Param('id') id: string,
    @Body(ValidationPipe) animalDto: AnimalDto,
  ) {
    return await this.animalService.updateAnimal(id, req.user.id, animalDto);
  }

  @ApiResponse({
    status: 200,
    description: 'Animal eliminado correctamente',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para eliminar este animal',
  })
  @ApiResponse({
    status: 404,
    description: 'El animal especificado no existe',
  })
  @Delete(':id')
  @Roles(UserRole.EMPLEADO)
  async deleteAnimal(@Request() req, @Param('id') id: string) {
    return await this.animalService.deleteAnimal(id, req.user.id);
  }

  @ApiResponse({
    status: 200,
    description: 'Array de animales',
    type: [AnimalResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'No hay animales registrados',
  })
  @Get()
  async getAllAnimals() {
    return this.animalService.getAllAnimals();
  }

  @ApiResponse({
    status: 200,
    description: 'Array de animales',
    type: [AnimalResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Animal no encontrado',
  })
  @Get(':id')
  async getAnimalById(@Param('id') id: string) {
    return this.animalService.getAnimalById(id);
  }
}
