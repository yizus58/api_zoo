import {
  Injectable,
  ConflictException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { User } from '../models/user.model';
import { UserRole } from '../types/user.types';
import { CreateUserDto } from '../dto/auth.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService implements OnApplicationBootstrap {
  private adminUserSeeded = false;

  constructor(
    @InjectModel(User)
    private readonly userRepository: typeof User,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const shouldSeedAdmin =
      this.configService.get<string>('NODE_ENV') === 'development' ||
      this.configService.get<boolean>('SEED_ADMIN', false);

    if (shouldSeedAdmin && !this.adminUserSeeded) {
      try {
        await this.seedAdminUser();
      } catch (error) {
        console.error('Failed to create user ADMIN:', error.message);
      }
    }
  }

  private async seedAdminUser() {
    if (this.adminUserSeeded) {
      return;
    }

    const adminExists = await this.userRepository.findOne({
      where: { email: 'admin@mail.com' },
      attributes: ['id'],
    });

    if (!adminExists) {
      const saltRounds =
        this.configService.get<string>('NODE_ENV') === 'development' ? 8 : 10;
      const hashedPassword = await bcrypt.hash('admin', saltRounds);

      const adminUser = await this.userRepository.create({
        id: uuidv4(),
        email: 'admin@mail.com',
        password: hashedPassword,
        role: UserRole.ADMIN,
      });

      if (this.configService.get<string>('NODE_ENV') === 'development') {
        console.log('Admin user created successfully');
      }
    }

    this.adminUserSeeded = true;
  }

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<{ id: string; email: string; role: UserRole }> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const newUser = await this.userRepository.create({
      id: uuidv4(),
      email: createUserDto.email,
      password: hashedPassword,
      role: createUserDto.role,
    });

    return {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
    });
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async getAllUsers(): Promise<User[]> {
    const users = await this.userRepository.findAll({
      attributes: { exclude: ['password'] },
    });
    return users;
  }
}
