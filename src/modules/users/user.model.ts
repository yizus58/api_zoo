import {
  Column,
  DataType,
  Default,
  DefaultScope,
  Model,
  PrimaryKey,
  Scopes,
  Table,
} from 'sequelize-typescript';
import { UserRole } from '../../common/types/user-role';

/** The password hash is excluded by default; only login asks for it (scope "withPassword"). */
@DefaultScope(() => ({ attributes: { exclude: ['password'] } }))
@Scopes(() => ({ withPassword: { attributes: { include: ['password'] } } }))
@Table({ tableName: 'users', timestamps: false })
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare email: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare password: string;

  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    allowNull: false,
    defaultValue: UserRole.EMPLEADO,
  })
  declare role: UserRole;
}
