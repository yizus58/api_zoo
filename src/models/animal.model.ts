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
  HasMany,
} from 'sequelize-typescript';
import { Species } from './species.model';
import { User } from './user.model';
import { Comment } from './comment.model';

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

  @HasMany(() => Comment, { foreignKey: 'id' })
  declare comments: Comment[];
}
