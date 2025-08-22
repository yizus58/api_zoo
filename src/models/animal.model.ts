import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  Unique,
  AllowNull,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { Species } from './species.model';
import { User } from './user.model';

@Table({
  tableName: 'animals',
})
export class Animal extends Model<Animal> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Unique
  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  declare nombre: string;

  @ForeignKey(() => Species)
  @Column({
    type: DataType.UUID,
  })
  declare id_especie: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
  })
  declare id_user_created: string;

  @BelongsTo(() => Species)
  declare species: Species;

  @BelongsTo(() => User)
  declare userCreated: User;
}
