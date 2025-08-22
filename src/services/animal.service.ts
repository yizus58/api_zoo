import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Animal } from '../models/animal.model';
import { AnimalDto } from '../dto/animal.dto';
import { Species } from '../models/species.model';
import { User } from '../models/user.model';

@Injectable()
export class AnimalService {
  constructor(
    @InjectModel(Animal)
    private readonly animalRepository: typeof Animal,
    @InjectModel(Species)
    private readonly speciesRepository: typeof Species,
    @InjectModel(User)
    private readonly userRepository: typeof User,
  ) {}

  async getAllAnimals() {
    const findAnimals = await this.animalRepository.findAll({
      attributes: { exclude: ['id_especie', 'id_user_created'] },
      include: [
        {
          model: Species,
          attributes: ['nombre'],
        },
        {
          model: User,
          attributes: ['email'],
        },
      ],
    });

    if (findAnimals.length == 0) {
      throw new NotFoundException('No hay animales registrados');
    }
    return {
      status: true,
      data: findAnimals,
    };
  }

  async createAnimal(id: string, animalDto: AnimalDto) {
    const findAnimal = await this.animalRepository.findOne({
      where: { nombre: animalDto.nombre },
    });

    if (findAnimal) {
      throw new ConflictException('Ya hay un animal existente con ese nombre');
    }

    const findSpecies = await this.speciesRepository.findByPk(
      animalDto.id_especie,
    );
    if (!findSpecies) {
      throw new NotFoundException('La especie especificada no existe');
    }

    const findUser = await this.userRepository.findByPk(id);
    if (!findUser) {
      throw new NotFoundException('El usuario especificado no existe');
    }

    const data = {
      nombre: animalDto.nombre,
      id_especie: animalDto.id_especie,
      id_user_created: id,
    };

    const save = await this.animalRepository.create(data);
    if (save) {
      return {
        status: true,
        message: 'Animal creado correctamente',
      };
    }
  }

  async updateAnimal(id: string, id_user: string, animalDto: AnimalDto) {
    const findAnimal = await this.animalRepository.findByPk(id);
    if (!findAnimal) {
      throw new NotFoundException('El animal especificado no existe');
    }

    const findSpecies = await this.speciesRepository.findByPk(
      animalDto.id_especie,
    );
    if (!findSpecies) {
      throw new NotFoundException('La especie especificada no existe');
    }

    const findUser = await this.userRepository.findByPk(id_user);
    if (!findUser) {
      throw new NotFoundException('El usuario especificado no existe');
    }

    const update = await this.animalRepository.update(animalDto, {
      where: { id },
    });

    if (update) {
      return {
        status: true,
        message: 'Animal actualizado correctamente',
      };
    }
  }

  async deleteAnimal(id: string) {
    const findAnimal = await this.animalRepository.findByPk(id);
    if (!findAnimal) {
      throw new NotFoundException('El animal especificado no existe');
    }

    const deleteAnimal = await this.animalRepository.destroy({
      where: { id },
    });

    if (deleteAnimal) {
      return {
        status: true,
        message: 'Animal eliminado correctamente',
      };
    }
  }
}
