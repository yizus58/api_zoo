import {
  Column,
  DataType,
  Default,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Species } from '../species/species.model';

@Table({ tableName: 'areas', timestamps: false })
export class Zone extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare nombre: string;

  @HasMany(() => Species, { foreignKey: 'id_area' })
  declare species: Species[];
}
