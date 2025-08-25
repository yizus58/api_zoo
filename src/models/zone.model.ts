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
})
export class Zone extends Model<Zone> {
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

  @HasMany(() => Species)
  declare species: Species[];
}
