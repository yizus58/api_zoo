import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/auth.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../types/user.types';
import { ApiResponse } from '@nestjs/swagger';
import { UserCreateResponseDto } from '../dto/response.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiResponse({
    status: 201,
    description: 'Array de usuarios',
    type: [UserCreateResponseDto],
  })
  @ApiResponse({
    status: 409,
    description: 'El email ya está registrado',
  })
  @Post()
  @Roles(UserRole.ADMIN)
  async createUser(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return await this.userService.createUser(createUserDto);
  }

  @ApiResponse({
    status: 200,
    description: 'Array de usuarios',
    type: [UserCreateResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'No hay usuarios registrados',
  })
  @Get()
  @Roles(UserRole.ADMIN)
  async getAllUsers() {
    return this.userService.getAllUsers();
  }

  @ApiResponse({
    status: 200,
    description: 'Array de usuario',
    type: [UserCreateResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  @Get('profile')
  @Roles(UserRole.ADMIN || UserRole.USUARIO)
  async getProfile(@Request() req) {
    return await this.userService.findById(req.user.id);
  }
}
