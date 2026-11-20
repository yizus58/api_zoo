import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, Op } from 'sequelize';
import { Animal } from '../animals/animal.model';
import { Zone } from '../zones/zone.model';
import { SpeciesDto } from './dto/species.dto';
import { Species } from './species.model';

export const SPECIES_NOT_FOUND = 'La especie especificada no existe';
export const AREA_NOT_FOUND = 'El área especificada no existe';

// A factory, not a constant: Sequelize mutates the options it is given.
const withAnimals = (): FindOptions => ({
  attributes: ['id', 'nombre'],
  include: [{ model: Animal, attributes: ['id', 'nombre'] }],
});

@Injectable()
export class SpeciesService {
  constructor(
    @InjectModel(Species) private readonly species: typeof Species,
    @InjectModel(Zone) private readonly zones: typeof Zone,
    @InjectModel(Animal) private readonly animals: typeof Animal,
  ) {}

  findAll(): Promise<Species[]> {
    return this.species.findAll({
      ...withAnimals(),
      order: [['nombre', 'ASC']],
    });
  }

  async findById(id: string): Promise<Species> {
    const species = await this.species.findByPk(id, withAnimals());
    if (!species) {
      throw new NotFoundException(SPECIES_NOT_FOUND);
    }
    return species;
  }

  async create(dto: SpeciesDto): Promise<Species> {
    await this.ensureNameIsFree(dto.nombre);
    await this.ensureAreaExists(dto.id_area);
    return this.species.create({ nombre: dto.nombre, id_area: dto.id_area });
  }

  async update(id: string, dto: SpeciesDto): Promise<Species> {
    const species = await this.species.findByPk(id);
    if (!species) {
      throw new NotFoundException(SPECIES_NOT_FOUND);
    }
    await this.ensureAreaExists(dto.id_area);
    await this.ensureNameIsFree(dto.nombre, id);
    return species.update({ nombre: dto.nombre, id_area: dto.id_area });
  }

  /** Refused while animals belong to the species. */
  async remove(id: string): Promise<void> {
    const species = await this.species.findByPk(id);
    if (!species) {
      throw new NotFoundException(SPECIES_NOT_FOUND);
    }
    if ((await this.animals.count({ where: { id_especie: id } })) > 0) {
      throw new ConflictException(
        'No se puede eliminar la especie, hay animales relacionados',
      );
    }
    await species.destroy();
  }

  private async ensureAreaExists(id: string): Promise<void> {
    if (!(await this.zones.findByPk(id))) {
      throw new NotFoundException(AREA_NOT_FOUND);
    }
  }

  private async ensureNameIsFree(
    nombre: string,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.species.findOne({
      where: exceptId ? { nombre, id: { [Op.ne]: exceptId } } : { nombre },
    });
    if (existing) {
      throw new ConflictException(
        'Ya hay una especie existente con ese nombre',
      );
    }
  }
}
