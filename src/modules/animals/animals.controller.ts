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
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { UserRole } from '../../common/types/user-role';
import { Animal } from './animal.model';
import { AnimalsService } from './animals.service';
import { AnimalDetailDto, AnimalResponseDto } from './dto/animal-response.dto';
import { AnimalDto } from './dto/animal.dto';

@ApiTags('animales')
@ApiBearerAuth()
@Controller('animales')
export class AnimalsController {
  constructor(private readonly animals: AnimalsService) {}

  @Post()
  @Roles(UserRole.EMPLEADO)
  @ApiCreatedResponse({ type: AnimalResponseDto })
  @ApiNotFoundResponse({ description: 'La especie especificada no existe' })
  @ApiConflictResponse({
    description: 'Ya hay un animal existente con ese nombre',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AnimalDto,
  ): Promise<Animal> {
    return this.animals.create(user.id, dto);
  }

  @Get()
  @ApiOkResponse({
    type: [AnimalDetailDto],
    description: '[] si no hay animales',
  })
  findAll(): Promise<Animal[]> {
    return this.animals.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: AnimalDetailDto })
  @ApiNotFoundResponse({ description: 'Animal no encontrado' })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<Animal> {
    return this.animals.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.EMPLEADO)
  @ApiOkResponse({ type: AnimalResponseDto })
  @ApiForbiddenResponse({
    description: 'Solo el empleado responsable puede editarlo',
  })
  @ApiNotFoundResponse({ description: 'El animal o la especie no existen' })
  @ApiConflictResponse({
    description: 'Ya hay un animal existente con ese nombre',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnimalDto,
  ): Promise<Animal> {
    return this.animals.update(id, user.id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.EMPLEADO)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Animal y sus comentarios eliminados' })
  @ApiForbiddenResponse({
    description: 'Solo el empleado responsable puede eliminarlo',
  })
  @ApiNotFoundResponse({ description: 'El animal especificado no existe' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.animals.remove(id, user.id);
  }
}
