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
import { Zone } from './zone.model';
import { Animal } from './animal.model';

@Table({
  tableName: 'species',
  timestamps: false,
})
export class Species extends Model<Species> {
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
