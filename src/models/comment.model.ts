import { ApiProperty } from '@nestjs/swagger';
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

  @ApiProperty({
    description: 'Comentario sobre el animal',
    example: 'Que hermoso leon',
    type: DataType.TEXT,
    nullable: false,
  })
  @AllowNull(false)
  @Column({
    type: DataType.TEXT,
  })
  declare comentario: string;

  @ApiProperty({
    description: 'ID del animal que se esta comentando',
    example: 'eab3b67f-a18e-4e2b-b675-9e0cbe7f5bc6',
    type: DataType.UUID,
    nullable: false,
  })
  @ForeignKey(() => Animal)
  @Column({
    type: DataType.UUID,
  })
  declare id_animal: string;

  @ApiProperty({
    description: 'ID del usuario que esta comentando',
    example: '9e0c67f-a18e-4e2b-b675-eab3be7f5bc6',
    type: DataType.UUID,
    nullable: false,
  })
  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
  })
  declare id_user: string;

  @ApiProperty({
    description: 'ID del comentario inicial al cual se esta respondiendo',
    example: '9e0c67f-a18e-4e2b-b675-eab3be7f5bc6',
    type: DataType.UUID,
    nullable: true,
  })
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
