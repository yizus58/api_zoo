import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { UserRole } from '../../common/types/user-role';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'El email ya está registrado' })
  @ApiForbiddenResponse({ description: 'Solo ADMIN' })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.users.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOkResponse({
    type: [UserResponseDto],
    description: '[] si no hay usuarios',
  })
  findAll(): Promise<UserResponseDto[]> {
    return this.users.findAll();
  }

  @Get('profile')
  @ApiOkResponse({
    type: UserResponseDto,
    description: 'El usuario autenticado (cualquier rol)',
  })
  profile(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.users.findById(user.id);
  }
}
