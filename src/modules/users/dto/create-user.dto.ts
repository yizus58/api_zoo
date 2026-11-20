import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../common/types/user-role';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@mail.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'juanito1234', minLength: 8 })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres' })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.EMPLEADO })
  @IsEnum(UserRole, { message: 'El rol debe ser ADMIN, EMPLEADO o USUARIO' })
  role: UserRole;
}
