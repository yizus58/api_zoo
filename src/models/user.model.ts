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
    example: 'juanito@mail.com',
    description: 'Correo electronico del usuario',
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
    example: 'juanito1234',
    description: 'Contraseña del usuario',
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
