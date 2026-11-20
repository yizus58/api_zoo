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
import { Zone } from '../zones/zone.model';

@Table({ tableName: 'species', timestamps: false })
export class Species extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare nombre: string;

  @ForeignKey(() => Zone)
  @Column(DataType.UUID)
  declare id_area: string;

  @BelongsTo(() => Zone, { foreignKey: 'id_area' })
  declare zone: Zone;

  @HasMany(() => Animal, { foreignKey: 'id_especie' })
  declare animals: Animal[];
}
