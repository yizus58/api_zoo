import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { fn, col, where } from 'sequelize';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './user.model';

export const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User) private readonly users: typeof User) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    if (await this.findByEmail(dto.email)) {
      throw new ConflictException('El email ya está registrado');
    }
    const user = await this.users.create({
      email: dto.email,
      password: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      role: dto.role,
    });
    return toResponse(user);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.users.findAll({ order: [['email', 'ASC']] });
    return users.map(toResponse);
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.users.findByPk(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return toResponse(user);
  }

  /** For the JWT guard: null instead of an exception when the user no longer exists. */
  async findAuthenticated(id: string): Promise<AuthenticatedUser | null> {
    const user = await this.users.findByPk(id);
    return user ? toResponse(user) : null;
  }

  /** Case-insensitive, including the password hash (login only). */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users.scope('withPassword').findOne({
      where: where(fn('lower', col('email')), email.trim().toLowerCase()),
    });
  }

  private findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({
      where: where(fn('lower', col('email')), email.trim().toLowerCase()),
    });
  }
}

export function toResponse(user: User): UserResponseDto {
  return { id: user.id, email: user.email, role: user.role };
}
