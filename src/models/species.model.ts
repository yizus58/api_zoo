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
} from 'sequelize-typescript';
import { Zone } from './zone.model';

@Table({
  tableName: 'species',
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
}
