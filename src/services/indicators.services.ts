import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Animal } from '../models/animal.model';
import { Species } from '../models/species.model';
import { User } from '../models/user.model';
import { Comment } from '../models/comment.model';
import { Zone } from '../models/zone.model';

@Injectable()
export class IndicatorsService {
  constructor(
    @InjectModel(Animal)
    private readonly animalRepository: typeof Animal,
    @InjectModel(Comment)
    private readonly commentRepository: typeof Comment,
    @InjectModel(Species)
    private readonly speciesRepository: typeof Species,
    @InjectModel(User)
    private readonly userRepository: typeof User,
    @InjectModel(Zone)
    private readonly zoneRepository: typeof Zone,
  ) {}

  async findAnimalsZones(id: string | null) {
    if (id === null) {
      return await this.zoneRepository.findAll({
        attributes: ['id', 'name'],
        include: [
          {
            model: Species,
            attributes: ['id'],
            include: [
              {
                model: Animal,
                attributes: ['id'],
              },
            ],
          },
        ],
      });
    }

    return await this.zoneRepository.findAll({
      attributes: ['id', 'name'],
      where: { id },
      include: [
        {
          model: Species,
          attributes: ['id'],
          include: [
            {
              model: Animal,
              attributes: ['id'],
            },
          ],
        },
      ],
    });
  }

  async findAnimalsSpecies(id: string | null) {
    if (id === null) {
      return await this.speciesRepository.findAll({
        attributes: ['id', 'nombre'],
        include: [
          {
            model: Animal,
            attributes: ['id'],
          },
        ],
      })
    }
    return await this.speciesRepository.findAll({
      attributes: ['id', 'nombre'],
      where: { id },
      include: [
        {
          model: Animal,
          attributes: ['id'],
        },
      ],
    })
  }

  async getTotalAnimalsSpecies(id: string | null) {
    const findSpecies = await this.findAnimalsSpecies(id);

    if (findSpecies.length === 0) {
      throw new HttpException(
        'No hay especies registradas',
        HttpStatus.NO_CONTENT,
      );
    }

    const speciesList = findSpecies as Array<Species & { animals: Animal[] }>;
    const result: Array<{
      id: string;
      nombre: string;
      'total animals': number;
    }> = speciesList.map((sp) => ({
      id: sp.id as unknown as string,
      nombre: ((sp as any).name ?? (sp as any).nombre) as string,
      'total animals': (sp.animals ?? []).length,
    }));

    return result;
  }

  async getTotalAnimalsByArea(id: string | null) {
    const findArea = await this.findAnimalsZones(id);

    if (findArea.length === 0) {
      throw new HttpException(
        'No hay zonas registradas',
        HttpStatus.NO_CONTENT,
      );
    }

    const zones = findArea as Array<
      Zone & { species: Array<Species & { animals: Animal[] }> }
    >;

    const result: Array<{
      id: string;
      name: string;
      'total animals': number;
    }> = zones.map((area) => {
      const totalAnimals = (area.species || []).reduce(
        (acc, sp) => acc + (sp.animals || []).length,
        0,
      );

      return {
        id: area.id as unknown as string,
        name: (area as any).name,
        'total animals': totalAnimals,
      };
    });

    if (id !== null) {
      return result.map(({ id, ...rest }) => rest);
    }

    return result;
  }
}
