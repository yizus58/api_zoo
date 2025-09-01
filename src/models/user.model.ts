import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Model,
  Table,
  DataType,
  PrimaryKey,
  Default,
  Unique,
} from 'sequelize-typescript';
import { UserRole } from '../types/user.types';

@Table({
  tableName: 'users',
  timestamps: false,
})
export class User extends Model<User> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ApiProperty({
    description: 'Correo electronico del usuario',
    example: 'juanito@mail.com',
    type: DataType.STRING,
    nullable: false,
  })
  @Unique
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'juanito1234',
    type: DataType.STRING,
    nullable: false,
  })
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password: string;

  @ApiProperty({ type: DataType.ENUM, nullable: false })
  @Column({
    type: DataType.ENUM,
    values: Object.values(UserRole),
    allowNull: false,
    defaultValue: UserRole.EMPLEADO,
  })
  role: UserRole;
}
