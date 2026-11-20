import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Comment } from '../comments/comment.model';
import { Species } from '../species/species.model';
import { User } from '../users/user.model';
import { Animal } from './animal.model';
import { AnimalDto } from './dto/animal.dto';

export const ANIMAL_NOT_FOUND = 'El animal especificado no existe';
export const SPECIES_NOT_FOUND = 'La especie especificada no existe';

// A factory, not a constant: Sequelize mutates the options it is given.
const detail = (): FindOptions => ({
  attributes: ['id', 'nombre', 'fecha'],
  include: [
    { model: Species, attributes: ['nombre'] },
    { model: User, attributes: ['email'] },
  ],
});

@Injectable()
export class AnimalsService {
  constructor(
    @InjectModel(Animal) private readonly animals: typeof Animal,
    @InjectModel(Species) private readonly species: typeof Species,
    @InjectModel(Comment) private readonly comments: typeof Comment,
    private readonly sequelize: Sequelize,
  ) {}

  findAll(): Promise<Animal[]> {
    return this.animals.findAll({ ...detail(), order: [['nombre', 'ASC']] });
  }

  async findById(id: string): Promise<Animal> {
    const animal = await this.animals.findByPk(id, detail());
    if (!animal) {
      throw new NotFoundException('Animal no encontrado');
    }
    return animal;
  }

  /** The employee who registers the animal becomes responsible for it. */
  async create(userId: string, dto: AnimalDto): Promise<Animal> {
    await this.ensureNameIsFree(dto.nombre);
    await this.ensureSpeciesExists(dto.id_especie);
    return this.animals.create({
      nombre: dto.nombre,
      id_especie: dto.id_especie,
      id_user: userId,
      fecha: new Date(),
    });
  }

  async update(id: string, userId: string, dto: AnimalDto): Promise<Animal> {
    const animal = await this.ownedAnimal(id, userId, 'editar');
    await this.ensureSpeciesExists(dto.id_especie);
    await this.ensureNameIsFree(dto.nombre, id);
    return animal.update({ nombre: dto.nombre, id_especie: dto.id_especie });
  }

  /** Deletes the animal and all its comments (and replies) in one transaction. */
  async remove(id: string, userId: string): Promise<void> {
    const animal = await this.ownedAnimal(id, userId, 'eliminar');
    await this.sequelize.transaction(async (transaction) => {
      await this.comments.destroy({ where: { id_animal: id }, transaction });
      await animal.destroy({ transaction });
    });
  }

  private async ownedAnimal(
    id: string,
    userId: string,
    action: string,
  ): Promise<Animal> {
    const animal = await this.animals.findByPk(id);
    if (!animal) {
      throw new NotFoundException(ANIMAL_NOT_FOUND);
    }
    if (animal.id_user !== userId) {
      throw new ForbiddenException(
        `No tienes permisos para ${action} este animal`,
      );
    }
    return animal;
  }

  private async ensureSpeciesExists(id: string): Promise<void> {
    if (!(await this.species.findByPk(id))) {
      throw new NotFoundException(SPECIES_NOT_FOUND);
    }
  }

  private async ensureNameIsFree(
    nombre: string,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.animals.findOne({
      where: exceptId ? { nombre, id: { [Op.ne]: exceptId } } : { nombre },
    });
    if (existing) {
      throw new ConflictException('Ya hay un animal existente con ese nombre');
    }
  }
}
