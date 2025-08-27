import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Animal } from '../models/animal.model';
import { Species } from '../models/species.model';
import { User } from '../models/user.model';
import { Comment } from '../models/comment.model';
import { Zone } from '../models/zone.model';
import { Op } from 'sequelize';
import {
  AnimalSpeciesIndicator,
  ZoneIndicator,
  CommentStatsResponse,
  CommentAnalysisResponse,
} from '../types/query.types';

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

  async getTotalAnimalsSpecies(
    id: string | null,
  ): Promise<AnimalSpeciesIndicator[]> {
    const findSpecies = await this.findAnimalsSpecies(id);

    if (findSpecies.length === 0) {
      throw new HttpException(
        'No hay especies registradas',
        HttpStatus.NOT_FOUND,
      );
    }

    const speciesList = findSpecies as Array<Species & { animals: Animal[] }>;
    const result: AnimalSpeciesIndicator[] = speciesList.map((sp) => ({
      id: sp.id as unknown as string,
      nombre: ((sp as any).name ?? (sp as any).nombre) as string,
      'total animals': (sp.animals ?? []).length,
    }));

    return result;
  }

  async getTotalAnimalsByArea(
    id: string | null,
  ): Promise<ZoneIndicator[] | Omit<ZoneIndicator, 'id'>[]> {
    const findArea = await this.findAnimalsZones(id);

    if (findArea.length === 0) {
      throw new HttpException('No hay zonas registradas', HttpStatus.NOT_FOUND);
    }

    const zones = findArea as Array<
      Zone & { species: Array<Species & { animals: Animal[] }> }
    >;

    const result: ZoneIndicator[] = zones.map((area) => {
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
        attributes: ['id', 'comentario', 'id_user', 'fecha'],
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

  async getAverageCommentBySpecies(
    id: string | null,
  ): Promise<CommentStatsResponse> {
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

    const animalsWithComments = find.filter(animal => animal.comments.length > 0);
    const animalsWithoutComments = find.filter(animal => animal.comments.length === 0);

    const animalsWithPercentage = animalsWithComments.map((animal) => {
      const commentCount = animal.comments.length;
      const percentage = total_comments > 0 ? ((commentCount / total_comments) * 100).toFixed(2) : '0.00';

      return {
        id: animal.id,
        nombre: animal.nombre,
        total_comentarios: commentCount,
        porcentaje_comentarios: parseFloat(percentage),
        comentarios: animal.comments,
      };
    });

    const sortedResults = [...animalsWithPercentage].sort(
      (a, b) => b.porcentaje_comentarios - a.porcentaje_comentarios,
    );

    return {
      animales: sortedResults,
      total_comentarios: total_comments,
      total_animales_con_comentarios: animalsWithComments.length,
      total_animales_sin_comentarios: animalsWithoutComments.length,
    };
  }

  async getAverageComment(): Promise<CommentAnalysisResponse> {
    const findComments = await this.commentRepository.findAll({
      attributes: [
        'id',
        'comentario',
        'id_animal',
        'id_comentario_principal',
        'fecha',
      ],
      include: [
        {
          model: Comment,
          as: 'respuestas',
          attributes: ['id', 'comentario', 'fecha'],
        },
        {
          model: Animal,
          as: 'animal',
          attributes: ['id', 'nombre'],
        },
      ],
    });

    if (findComments.length === 0) {
      throw new HttpException(
        'No hay comentarios registrados',
        HttpStatus.NOT_FOUND,
      );
    }

    const comentariosPrincipales = findComments.filter(
      (comment) =>
        comment.id_comentario_principal === null ||
        comment.id_comentario_principal === undefined,
    );

    if (comentariosPrincipales.length === 0) {
      throw new HttpException(
        'No hay comentarios principales registrados',
        HttpStatus.NOT_FOUND,
      );
    }

    const comentariosConRespuestas = comentariosPrincipales.filter(
      (comment) => comment.respuestas && comment.respuestas.length > 0,
    );

    const comentariosSinRespuestas = comentariosPrincipales.filter(
      (comment) => !comment.respuestas || comment.respuestas.length === 0,
    );

    const totalComentariosPrincipales = comentariosPrincipales.length;
    const totalConRespuestas = comentariosConRespuestas.length;
    const totalSinRespuestas = comentariosSinRespuestas.length;

    const porcentajeConRespuestas = (
      (totalConRespuestas / totalComentariosPrincipales) *
      100
    ).toFixed(2);
    const porcentajeSinRespuestas = (
      (totalSinRespuestas / totalComentariosPrincipales) *
      100
    ).toFixed(2);

    const estadisticas = [
      {
        categoria: 'Comentarios con respuestas',
        cantidad: totalConRespuestas,
        porcentaje: parseFloat(porcentajeConRespuestas),
        comentarios: comentariosConRespuestas.map((comment) => ({
          id: comment.id,
          comentario: comment.comentario,
          animal: comment.animal ? comment.animal.nombre : 'Sin animal',
          totalRespuestas: comment.respuestas ? comment.respuestas.length : 0,
          respuestas: comment.respuestas || [],
        })),
      },
      {
        categoria: 'Comentarios sin respuestas',
        cantidad: totalSinRespuestas,
        porcentaje: parseFloat(porcentajeSinRespuestas),
        comentarios: comentariosSinRespuestas.map((comment) => ({
          id: comment.id,
          comentario: comment.comentario,
          animal: comment.animal ? comment.animal.nombre : 'Sin animal',
          totalRespuestas: 0,
          respuestas: [],
        })),
      },
    ].sort((a, b) => b.porcentaje - a.porcentaje);

    return {
      estadisticas: estadisticas,
      resumen: {
        total_comentarios_principales: totalComentariosPrincipales,
        comentarios_con_respuestas: totalConRespuestas,
        comentarios_sin_respuestas: totalSinRespuestas,
        porcentaje_con_respuestas: parseFloat(porcentajeConRespuestas),
        porcentaje_sin_respuestas: parseFloat(porcentajeSinRespuestas),
      },
    };
  }

  async findZoneQuery(like: string) {
    const zonesWithSpecies = await this.zoneRepository.findAll({
      where: { nombre: { [Op.iLike]: `%${like}%` } },
    });

    if (zonesWithSpecies.length === 0) {
      return null;
    }
    return zonesWithSpecies;
  }

  async findSpeciesQuery(like: string) {
    const speciesQuery = await this.speciesRepository.findAll({
      where: { nombre: { [Op.iLike]: `%${like}%` } },
    });

    if (speciesQuery.length === 0) {
      return null;
    }

    return speciesQuery;
  }

  async findAnimalsQuery(like: string) {
    const animalsQuery = await this.animalRepository.findAll({
      where: { nombre: { [Op.iLike]: `%${like}%` } },
    });

    if (animalsQuery.length === 0) {
      return null;
    }

    return animalsQuery;
  }

  async findCommentsWithOutResponseQuery(like: string) {
    const commentayQuery = await this.commentRepository.findAll({
      where: {
        [Op.and]: [
          {
            comentario: { [Op.iLike]: `%${like}%` },
          },
          {
            id_comentario_principal: { [Op.is]: null },
          },
        ],
      },
    });

    if (commentayQuery.length === 0) {
      return null;
    }

    return commentayQuery;
  }

  async findCommentsResponseQuery(like: string) {
    const commentayQuery = await this.commentRepository.findAll({
      where: {
        [Op.and]: [
          {
            comentario: { [Op.iLike]: `%${like}%` },
          },
          {
            id_comentario_principal: { [Op.ne]: null },
          },
        ],
      },
    });

    if (commentayQuery.length === 0) {
      return null;
    }

    return commentayQuery;
  }

  async findAllQuery(searchTerm: string) {
    const findZone = await this.findZoneQuery(searchTerm);
    const findSpecies = await this.findSpeciesQuery(searchTerm);
    const findAnimal = await this.findAnimalsQuery(searchTerm);
    const findCommentary =
      await this.findCommentsWithOutResponseQuery(searchTerm);
    const findResponseComment =
      await this.findCommentsResponseQuery(searchTerm);

    const data = {
      total_resultado:
        (findZone != null ? findZone.length : 0) +
        (findSpecies != null ? findSpecies.length : 0) +
        (findAnimal != null ? findAnimal.length : 0) +
        (findCommentary != null ? findCommentary.length : 0) +
        (findResponseComment != null ? findResponseComment.length : 0),
      resultado: {
        zona: findZone,
        especie: findSpecies,
        animal: findAnimal,
        comentario: findCommentary,
        respuesta: findResponseComment,
      },
    };

    return {
      termino_busqueda: searchTerm,
      data,
    };
  }

  async findAnimalsToDay() {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const animals = await this.animalRepository.findAll({
      attributes: { exclude: ['id', 'id_especie'] },
      include: [
        {
          model: Species,
          as: 'species',
          attributes: { exclude: ['id_area'] },
          include: [
            {
              model: Zone,
              as: 'zone',
            },
          ],
        },
      ],
      where: {
        fecha: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay,
        },
      },
    });

    return animals.map((animal) => {
      const animalJson = animal.toJSON();
      return {
        nombre: animalJson.nombre,
        id_usuario: animalJson.id_user,
        fecha: animalJson.fecha,
        especies: animalJson.species
          ? {
              id: animalJson.species.id,
              nombre: animalJson.species.nombre,
              area: animalJson.species.zone
                ? {
                    id: animalJson.species.zone.id,
                    nombre: animalJson.species.zone.nombre,
                  }
                : [],
            }
          : [],
      };
    });
  }

  async animalsCommentPerDay() {
    const userAnimalComment = [];
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);
    const findAnimalsComment = await this.commentRepository.findAll({
      where: {
        fecha: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay,
        },
      },
      include: [
        {
          model: Comment,
          as: 'respuestas',
          attributes: ['id', 'comentario', 'fecha'],
        },
      ],
    });

    if (findAnimalsComment.length == 0) {
      console.error('No hay comentarios en la base de datos');
      return;
    }

    const animalsComments = await Promise.all(
      findAnimalsComment.map(async (comment) => {
        const animal = await this.animalRepository.findByPk(comment.id_animal);
        const species = await this.speciesRepository.findByPk(
          animal.id_especie,
        );
        const zone = await this.zoneRepository.findByPk(species.id_area);
        const user = await this.userRepository.findByPk(comment.id_user);

        const commentData = {
          zona: zone.nombre,
          specie: species.nombre,
          animal: animal.nombre,
          comentario: comment.comentario,
          respuesta:
            comment.respuestas && comment.respuestas.length > 0
              ? comment.respuestas[0].comentario
              : '',
        };

        const existingUserIndex = userAnimalComment.findIndex(
          (item) => item.user === user.id,
        );

        if (existingUserIndex !== -1) {
          userAnimalComment[existingUserIndex].data.push(commentData);
        } else {
          userAnimalComment.push({
            user: user.id,
            email: user.email,
            data: [commentData],
          });
        }

        return commentData;
      }),
    );
    return { animalsComments, userAnimalComment };
  }
}
