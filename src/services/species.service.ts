import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Species } from '../models/species.model';
import { SpeciesDto } from '../dto/species.dto';
import { Zone } from '../models/zone.model';

@Injectable()
export class SpeciesService {
  constructor(
    @InjectModel(Species)
    private readonly speciesRepository: typeof Species,
    @InjectModel(Zone)
    private readonly zoneRepository: typeof Zone,
  ) {}

  async getAllSpecies() {
    const findSpecies = await this.speciesRepository.findAll({
      attributes: { exclude: ['id_area'] },
    });

    if (findSpecies.length == 0) {
      throw new NotFoundException('No hay especies registradas');
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
      throw new ConflictException(
        'Ya hay una especie existente con ese nombre',
      );
    }

    const findArea = await this.zoneRepository.findByPk(speciesDto.id_area);
    if (!findArea) {
      throw new NotFoundException('El área especificada no existe');
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
      throw new NotFoundException('La especie especificada no existe');
    }

    const findArea = await this.zoneRepository.findByPk(speciesDto.id_area);
    if (!findArea) {
      throw new NotFoundException('El área especificada no existe');
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
      throw new NotFoundException('La especie especificada no existe');
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
