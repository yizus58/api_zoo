import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../types/user.types';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'John.Doe@mail.com',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'juanito1234',
  })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;
}

export class CreateUserDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'John.Doe@mail.com',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'juanito1234',
  })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @MinLength(4, { message: 'La contraseña debe tener al menos 4 caracteres' })
  password: string;

  @ApiProperty({
    description: 'Rol del usuario',
    example: 'ADMIN | USUARIO | EMPLEADO',
  })
  @IsEnum(UserRole, { message: 'El rol debe ser ADMIN, EMPLEADO o USUARIO' })
  role: UserRole;
}
