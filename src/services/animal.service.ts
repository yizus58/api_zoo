import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Animal } from '../models/animal.model';
import { AnimalDto } from '../dto/animal.dto';
import { Species } from '../models/species.model';
import { User } from '../models/user.model';
import { Comment } from '../models/comment.model';

@Injectable()
export class AnimalService {
  constructor(
    @InjectModel(Animal)
    private readonly animalRepository: typeof Animal,
    @InjectModel(Species)
    private readonly speciesRepository: typeof Species,
    @InjectModel(User)
    private readonly userRepository: typeof User,
    @InjectModel(Comment)
    private readonly commentRepository: typeof Comment,
  ) {}

  async getAnimalById(id: string) {
    const findAnimal = await this.animalRepository.findByPk(id, {
      attributes: { exclude: ['id_especie', 'id_user'] },
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

    if (!findAnimal) {
      throw new HttpException('Animal no encontrado', HttpStatus.NOT_FOUND);
    }

    return {
      status: true,
      data: findAnimal,
    };
  }

  async getAllAnimals() {
    const findAnimals = await this.animalRepository.findAll({
      attributes: { exclude: ['id_especie', 'id_user'] },
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
      throw new HttpException(
        'No hay animales registrados',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      status: true,
      data: findAnimals,
    };
  }

  async createAnimal(id: string, animalDto: AnimalDto) {
    const date = new Date();
    const findAnimal = await this.animalRepository.findOne({
      where: { nombre: animalDto.nombre },
    });

    if (findAnimal) {
      throw new HttpException(
        'Ya hay un animal existente con ese nombre',
        HttpStatus.CONFLICT,
      );
    }

    const findSpecies = await this.speciesRepository.findByPk(
      animalDto.id_especie,
    );
    if (!findSpecies) {
      throw new HttpException(
        'La especie especificada no existe',
        HttpStatus.NOT_FOUND,
      );
    }

    const findUser = await this.userRepository.findByPk(id);
    if (!findUser) {
      throw new HttpException(
        'El usuario especificado no existe',
        HttpStatus.NOT_FOUND,
      );
    }

    const data = {
      nombre: animalDto.nombre,
      id_especie: animalDto.id_especie,
      id_user: id,
      fecha: date,
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
      throw new HttpException(
        'El animal especificado no existe',
        HttpStatus.NOT_FOUND,
      );
    }

    const findSpecies = await this.speciesRepository.findByPk(
      animalDto.id_especie,
    );
    if (!findSpecies) {
      throw new HttpException(
        'La especie especificada no existe',
        HttpStatus.NOT_FOUND,
      );
    }

    const findUser = await this.userRepository.findByPk(id_user);
    if (!findUser) {
      throw new HttpException(
        'El usuario especificado no existe',
        HttpStatus.NOT_FOUND,
      );
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
      throw new HttpException(
        'El animal especificado no existe',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.commentRepository.destroy({
      where: { id_animal: id },
    });

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
