import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Zone } from '../models/zone.model';
import { ZoneDto } from '../dto/zone.dto';
import { Species } from '../models/species.model';

@Injectable()
export class ZoneService {
  constructor(
    @InjectModel(Zone)
    private readonly zoneRepository: typeof Zone,
  ) {}

  async getAllAreas() {
    const findAreas = await this.zoneRepository.findAll({
      include: [
        {
          model: Species,
          as: 'species',
          attributes: { exclude: ['id_area'] },
        },
      ],
    });

    if (findAreas.length == 0) {
      throw new NotFoundException('No hay zonas registradas');
    }
    return findAreas;
  }

  async getAreaById(id: string) {
    const findZone = await this.zoneRepository.findByPk(id, {
      include: [
        {
          model: Species,
          as: 'species',
          attributes: { exclude: ['id_area'] },
        },
      ],
    });

    if (!findZone) {
      throw new NotFoundException(
        'No se encontró la zona con el id proporcionado',
      );
    }

    return findZone;
  }

  async createArea(zoneDto: ZoneDto) {
    const findZone = await this.zoneRepository.findOne({
      where: { name: zoneDto.name },
    });

    if (findZone) {
      throw new ConflictException('Ya hay una zona existente con ese nombre');
    }

    return await this.zoneRepository.create(zoneDto);
  }

  async updateArea(zoneDto: ZoneDto, id: string) {
    const findZone = await this.zoneRepository.findOne({
      where: { id: id },
    });

    if (!findZone) {
      throw new NotFoundException(
        'No se encontró la zona con el id proporcionado',
      );
    }

    const update = await this.zoneRepository.update(zoneDto, { where: { id: id } });
    if (update) {
      return {
        result: true,
        message: 'Zona actualizada con éxito',
      };
    }
  }

  async deleteArea(id: string) {
    const findZone = await this.zoneRepository.findOne({
      include: [
        {
          model: Species,
          as: 'species',
        },
      ],
      where: { id: id },
    });

    if (!findZone) {
      throw new NotFoundException(
        'No se encontró la zona con el id proporcionado',
      );
    }

    if (findZone.species.length > 0) {
      throw new ConflictException(
        'No se puede eliminar la zona ya que contiene especies',
      );
    }

    const deletedZone = await this.zoneRepository.destroy({ where: { id: id } });
    if (deletedZone) {
      return {
        result: true,
        message: 'Zona eliminada con éxito',
      };
    }
  }
}
