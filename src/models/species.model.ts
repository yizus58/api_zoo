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
import { Animal } from './animal.model';
import { Zone } from './zone.model';

@Table({
  tableName: 'species',
  timestamps: false,
})
export class Species extends Model<Species> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ApiProperty({
    example: 'crustáceos',
    description: 'Nombre de la especie',
    type: DataType.STRING,
    nullable: false,
  })
  @Unique
  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  declare nombre: string;

  @ApiProperty({
    example: 'eab3b67f-a18e-4e2b-b675-9e0cbe7f5bc6',
    description: 'ID de la zona que va a pertenecer',
    type: DataType.UUID,
    nullable: false,
  })
  @ForeignKey(() => Zone)
  @Column({
    type: DataType.UUID,
  })
  declare id_area: string;

  @BelongsTo(() => Zone)
  declare zone: Zone;

  @HasMany(() => Animal)
  declare animals: Animal[];
}
