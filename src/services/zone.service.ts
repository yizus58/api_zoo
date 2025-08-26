import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Zone } from '../models/zone.model';
import { ZoneDto } from '../dto/zone.dto';
import { Species } from '../models/species.model';
import { Animal } from '../models/animal.model';

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
          include: [
            {
              model: Animal,
              attributes: { exclude: ['id_especie', 'id_user'] },
            },
          ],
        },
      ],
    });

    if (findAreas.length == 0) {
      throw new HttpException(
        'No hay zonas registradas',
        HttpStatus.NOT_FOUND,
      );
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
          include: [
            {
              model: Animal,
              attributes: { exclude: ['id_especie', 'id_user'] },
              include: [
                {
                  model: Animal,
                  attributes: { exclude: ['id_especie', 'id_user'] },
                },
              ],
            },
          ],
        },
      ],
    });

    if (!findZone) {
      throw new HttpException(
        'No se encontró la zona especifica',
        HttpStatus.NOT_FOUND,
      );
    }

    return findZone;
  }

  async createArea(zoneDto: ZoneDto) {
    const findZone = await this.zoneRepository.findOne({
      where: { nombre: zoneDto.nombre },
    });

    if (findZone) {
      throw new HttpException(
        'Ya hay una zona existente con ese nombre',
        HttpStatus.CONFLICT,
      );
    }

    return await this.zoneRepository.create(zoneDto);
  }

  async updateArea(zoneDto: ZoneDto, id: string) {
    const findZone = await this.zoneRepository.findOne({
      where: { id: id },
    });

    if (!findZone) {
      throw new HttpException(
        'No se encontró la zona especifica',
        HttpStatus.NOT_FOUND,
      );
    }

    const update = await this.zoneRepository.update(zoneDto, {
      where: { id: id },
    });
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
          include: [
            {
              model: Animal,
              attributes: { exclude: ['id_especie', 'id_user'] },
            },
          ],
        },
      ],
      where: { id: id },
    });

    if (!findZone) {
      throw new HttpException(
        'No se encontró la zona especifica',
        HttpStatus.NOT_FOUND,
      );
    }

    if (findZone.species.length > 0) {
      throw new HttpException(
        'No se puede eliminar la zona ya que contiene especies',
        HttpStatus.CONFLICT,
      );
    }

    const deletedZone = await this.zoneRepository.destroy({
      where: { id: id },
    });
    if (deletedZone) {
      return {
        result: true,
        message: 'Zona eliminada con éxito',
      };
    }
  }
}
