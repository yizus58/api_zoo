import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Comment } from '../comments/comment.model';
import { Species } from '../species/species.model';
import { User } from '../users/user.model';

@Table({ tableName: 'animals', timestamps: false })
export class Animal extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare nombre: string;

  @ForeignKey(() => Species)
  @Column(DataType.UUID)
  declare id_especie: string;

  /** The employee who registered the animal and is responsible for it. */
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare id_user: string;

  @Column({ type: DataType.DATE, allowNull: false })
  declare fecha: Date;

  @BelongsTo(() => Species, { foreignKey: 'id_especie' })
  declare species: Species;

  @BelongsTo(() => User, { foreignKey: 'id_user' })
  declare userCreated: User;

  @HasMany(() => Comment, { foreignKey: 'id_animal' })
  declare comments: Comment[];
}
