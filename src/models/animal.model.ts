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
  timestamps: false,
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
  declare id_user: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare fecha: Date;

  @BelongsTo(() => Species)
  declare species: Species;

  @BelongsTo(() => User)
  declare userCreated: User;

  @HasMany(() => Comment, { foreignKey: 'id_animal' })
  declare comments: Comment[];
}
