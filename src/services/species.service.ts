import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Species } from '../models/species.model';
import { SpeciesDto } from '../dto/species.dto';
import { Zone } from '../models/zone.model';
import { Animal } from '../models/animal.model';

@Injectable()
export class SpeciesService {
  constructor(
    @InjectModel(Species)
    private readonly speciesRepository: typeof Species,
    @InjectModel(Zone)
    private readonly zoneRepository: typeof Zone,
  ) {}

  async getSpeciesById(id: string) {
    const findSpecies = await this.speciesRepository.findByPk(id, {
      attributes: { exclude: ['id_area'] },
      include: [
        {
          model: Animal,
          attributes: { exclude: ['id_especie', 'id_user_created'] },
        },
      ],
    });

    if (!findSpecies) {
      throw new HttpException(
        'La especie especificada no existe',
        HttpStatus.NO_CONTENT,
      );
    }

    return findSpecies;
  }

  async getAllSpecies() {
    const findSpecies = await this.speciesRepository.findAll({
      attributes: { exclude: ['id_area'] },
      include: [
        {
          model: Animal,
          attributes: { exclude: ['id_especie', 'id_user_created'] },
        },
      ],
    });

    if (findSpecies.length == 0) {
      throw new HttpException(
        'No hay especies registradas',
        HttpStatus.NO_CONTENT,
      );
    }
    return {
      status: true,
      data: findSpecies,
    };
  }

  async createSpecies(speciesDto: SpeciesDto) {
    const findSpecies = await this.speciesRepository.findOne({
      where: { nombre: speciesDto.nombre },
    });

    if (findSpecies) {
      throw new HttpException(
        'Ya hay una especie existente con ese nombre',
        HttpStatus.CONFLICT,
      );
    }

    const findArea = await this.zoneRepository.findByPk(speciesDto.id_area);
    if (!findArea) {
      throw new HttpException(
        'El área especificada no existe',
        HttpStatus.NO_CONTENT,
      );
    }

    const save = await this.speciesRepository.create(speciesDto);
    if (save) {
      return {
        status: true,
        message: 'Especie creada correctamente',
      };
    }
  }

  async updateSpecies(id: string, speciesDto: SpeciesDto) {
    const findSpecies = await this.speciesRepository.findByPk(id);
    if (!findSpecies) {
      throw new HttpException(
        'La especie especificada no existe',
        HttpStatus.NO_CONTENT,
      );
    }

    const findArea = await this.zoneRepository.findByPk(speciesDto.id_area);
    if (!findArea) {
      throw new HttpException(
        'El área especificada no existe',
        HttpStatus.NO_CONTENT,
      );
    }

    const update = await this.speciesRepository.update(speciesDto, {
      where: { id },
    });

    if (update) {
      return {
        status: true,
        message: 'Especie actualizada correctamente',
      };
    }
  }

  async deleteSpecies(id: string) {
    const findSpecies = await this.speciesRepository.findByPk(id);
    if (!findSpecies) {
      throw new HttpException(
        'La especie especificada no existe',
        HttpStatus.NO_CONTENT,
      );
    }

    if (findSpecies.animals.length > 0) {
      throw new HttpException(
        'No se puede eliminar la especie, hay animales relacionados',
        HttpStatus.CONFLICT,
      );
    }

    const deleteSpecies = await this.speciesRepository.destroy({
      where: { id },
    });

    if (deleteSpecies) {
      return {
        status: true,
        message: 'Especie eliminada correctamente',
      };
    }
  }
}
