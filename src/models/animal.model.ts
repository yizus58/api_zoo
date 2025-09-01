import { ApiProperty } from '@nestjs/swagger';
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
import { Comment } from './comment.model';
import { User } from './user.model';
import { Species } from './species.model';

@Table({
  tableName: 'animals',
  timestamps: false,
})
export class Animal extends Model<Animal> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ApiProperty({
    example: 'Leon',
    description: 'Nombre del animal',
    type: DataType.STRING,
    nullable: false,
    uniqueItems: true,
  })
  @Unique
  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  declare nombre: string;

  @ApiProperty({
    example: 'eab3b67f-a18e-4e2b-b675-9e0cbe7f5bc6',
    description: 'ID de la especie',
    type: DataType.UUID,
    nullable: false,
  })
  @ForeignKey(() => Species)
  @Column({
    type: DataType.UUID,
  })
  declare id_especie: string;

  @ApiProperty({
    example: 'eab3b67f-a18e-4e2b-b675-9e0cbe7f5bc6',
    description: 'ID del usuario que lo esta ingresando',
    type: DataType.UUID,
    nullable: false,
  })
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
