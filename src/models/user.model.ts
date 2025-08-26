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

  @Unique
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password: string;

  @Column({
    type: DataType.ENUM,
    values: Object.values(UserRole),
    allowNull: false,
    defaultValue: UserRole.EMPLEADO,
  })
  role: UserRole;
}
