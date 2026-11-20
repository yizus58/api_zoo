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
import { Animal } from '../animals/animal.model';
import { User } from '../users/user.model';

@Table({ tableName: 'comments', timestamps: false })
export class Comment extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare comentario: string;

  @ForeignKey(() => Animal)
  @Column(DataType.UUID)
  declare id_animal: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare id_user: string;

  /** Set on replies: the main comment being answered (one level deep). */
  @ForeignKey(() => Comment)
  @Column({ type: DataType.UUID, allowNull: true })
  declare id_comentario_principal: string | null;

  @Column({ type: DataType.DATE, allowNull: false })
  declare fecha: Date;

  @BelongsTo(() => Animal, { foreignKey: 'id_animal' })
  declare animal: Animal;

  @BelongsTo(() => User, { foreignKey: 'id_user' })
  declare userCreated: User;

  @BelongsTo(() => Comment, { foreignKey: 'id_comentario_principal' })
  declare comentarioPrincipal: Comment;

  @HasMany(() => Comment, { foreignKey: 'id_comentario_principal' })
  declare respuestas: Comment[];
}
