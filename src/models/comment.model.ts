import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  BelongsTo,
  ForeignKey,
  HasMany,
} from 'sequelize-typescript';
import { Animal } from './animal.model';
import { User } from './user.model';

@Table({
  tableName: 'comments',
  timestamps: false,
})
export class Comment extends Model<Comment> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column({
    type: DataType.TEXT,
  })
  declare comentario: string;

  @ForeignKey(() => Animal)
  @Column({
    type: DataType.UUID,
  })
  declare id_animal: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
  })
  declare id_user: string;

  @ForeignKey(() => Comment)
  @AllowNull(true)
  @Column({
    type: DataType.UUID,
  })
  declare id_comentario_principal: string;

  @AllowNull(false)
  @Column(DataType.DATE)
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
