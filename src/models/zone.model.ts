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
  HasMany,
} from 'sequelize-typescript';
import { Species } from './species.model';

@Table({
  tableName: 'areas',
  timestamps: false,
})
export class Zone extends Model<Zone> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ApiProperty({
    description: 'Nombre de la zona',
    example: 'Zona 1',
    type: DataType.STRING,
  })
  @Unique
  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  declare nombre: string;

  @HasMany(() => Species)
  declare species: Species[];
}
