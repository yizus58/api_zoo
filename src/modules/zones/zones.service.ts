import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Includeable, Op } from 'sequelize';
import { Animal } from '../animals/animal.model';
import { Species } from '../species/species.model';
import { ZoneDto } from './dto/zone.dto';
import { Zone } from './zone.model';

// A factory, not a constant: Sequelize mutates the include objects it is given.
const speciesWithAnimals = (): Includeable => ({
  model: Species,
  attributes: ['id', 'nombre'],
  include: [{ model: Animal, attributes: ['id', 'nombre'] }],
});

export const ZONE_NOT_FOUND = 'No se encontró la zona especificada';

@Injectable()
export class ZonesService {
  constructor(
    @InjectModel(Zone) private readonly zones: typeof Zone,
    @InjectModel(Species) private readonly species: typeof Species,
  ) {}

  findAll(): Promise<Zone[]> {
    return this.zones.findAll({
      include: [speciesWithAnimals()],
      order: [['nombre', 'ASC']],
    });
  }

  async findById(id: string): Promise<Zone> {
    const zone = await this.zones.findByPk(id, {
      include: [speciesWithAnimals()],
    });
    if (!zone) {
      throw new NotFoundException(ZONE_NOT_FOUND);
    }
    return zone;
  }

  async create(dto: ZoneDto): Promise<Zone> {
    await this.ensureNameIsFree(dto.nombre);
    return this.zones.create({ nombre: dto.nombre });
  }

  async update(id: string, dto: ZoneDto): Promise<Zone> {
    const zone = await this.zones.findByPk(id);
    if (!zone) {
      throw new NotFoundException(ZONE_NOT_FOUND);
    }
    await this.ensureNameIsFree(dto.nombre, id);
    return zone.update({ nombre: dto.nombre });
  }

  /** Refused while the zone still has species: they must be moved or deleted first. */
  async remove(id: string): Promise<void> {
    const zone = await this.zones.findByPk(id);
    if (!zone) {
      throw new NotFoundException(ZONE_NOT_FOUND);
    }
    if ((await this.species.count({ where: { id_area: id } })) > 0) {
      throw new ConflictException(
        'No se puede eliminar la zona ya que contiene especies',
      );
    }
    await zone.destroy();
  }

  private async ensureNameIsFree(
    nombre: string,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.zones.findOne({
      where: exceptId ? { nombre, id: { [Op.ne]: exceptId } } : { nombre },
    });
    if (existing) {
      throw new ConflictException('Ya hay una zona existente con ese nombre');
    }
  }
}
