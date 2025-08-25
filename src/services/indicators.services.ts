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
    return await this.zoneRepository.findAll({
      attributes: ['id', 'nombre'],
      where: id ? { id } : {},
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
    return await this.speciesRepository.findAll({
      attributes: ['id', 'nombre'],
      where: id ? { id } : {},
      include: [
        {
          model: Animal,
          attributes: ['id'],
        },
      ],
    });
  }

  async getTotalAnimalsSpecies(id: string | null) {
    const findSpecies = await this.findAnimalsSpecies(id);

    if (findSpecies.length === 0) {
      throw new HttpException(
        'No hay especies registradas',
        HttpStatus.NOT_FOUND,
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
      throw new HttpException('No hay zonas registradas', HttpStatus.NOT_FOUND);
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
        name: (area as any).nombre,
        'total animals': totalAnimals,
      };
    });

    if (id !== null) {
      return result.map(({ id, ...rest }) => rest);
    }

    return result;
  }

  async findCommentsAnimals(id: string | null, withUser: boolean = false) {
    const animals = await this.animalRepository.findAll({
      attributes: ['id', 'nombre'],
      where: id ? { id } : {},
    });

    const result = [];
    for (const animal of animals) {
      const comments = await this.commentRepository.findAll({
        where: { id_animal: animal.id },
        attributes: ['id', 'comentario', 'id_user_created', 'fecha'],
        include: withUser
          ? [
              {
                model: User,
                as: 'userCreated',
                attributes: ['id', 'email'],
              },
            ]
          : [],
      });

      result.push({
        id: animal.id,
        nombre: animal.nombre,
        comments: comments,
      });
    }
    return result;
  }

  async getAverageCommentBySpecies(id: string | null) {
    const find = await this.findCommentsAnimals(id);

    if (find.length === 0) {
      throw new HttpException(
        'No hay comentarios de animales aun registrados',
        HttpStatus.NOT_FOUND,
      );
    }

    const total_comments = find.reduce(
      (total, animal) => total + animal.comments.length,
      0,
    );

    const animalsWithPercentage = find.map((animal) => {
      const commentCount = animal.comments.length;
      const percentage = ((commentCount / total_comments) * 100).toFixed(2);

      return {
        id: animal.id,
        nombre: animal.nombre,
        total_comentarios: commentCount,
        porcentaje_comentarios: parseFloat(percentage),
        comentarios: animal.comments,
      };
    });

    const sortedResults = animalsWithPercentage.sort(
      (a, b) => b.porcentaje_comentarios - a.porcentaje_comentarios,
    );

    return {
      animales: sortedResults,
      total_comentarios: total_comments,
      total_animales_con_comentarios: find.length,
    };
  }

  async getAverageComment(id: string | null) {

  }
}
