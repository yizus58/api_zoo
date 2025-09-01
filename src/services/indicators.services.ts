import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Animal } from '../models/animal.model';
import { Comment } from '../models/comment.model';
import { Species } from '../models/species.model';
import { User } from '../models/user.model';
import { Zone } from '../models/zone.model';
import {
  AnimalSpeciesIndicator,
  ZoneIndicator,
  CommentStatsResponse,
  CommentAnalysisResponse,
} from '../types/query.types';

interface AnimalCommentData {
  zona: string;
  specie: string;
  animal: string;
  comentario: {
    id: string | number;
    comentario: string;
    autor: string;
    fecha: Date;
    respuesta?: {
      id: string | number;
      comentario: string;
      autor: string;
      fecha: Date;
      id_comentario_principal?: string | number;
    };
  };
}

interface UserAnimalComment {
  user: string;
  email: string;
  data: AnimalCommentData[];
}

interface DayRange {
  startOfDay: Date;
  endOfDay: Date;
}

@Injectable()
export class IndicatorsService {
  private readonly logger = new Logger(IndicatorsService.name);
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

  private getDayRange(): DayRange {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    return { startOfDay, endOfDay };
  }

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
      id: String(sp.id),
      nombre: sp.nombre || 'Sin nombre',
      'total animals': sp.animals?.length || 0,
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
      const totalAnimals =
        area.species?.reduce((acc, sp) => acc + (sp.animals?.length || 0), 0) ||
        0;

      return {
        id: String(area.id),
        name: area.nombre || 'Sin nombre',
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

    const animalsWithComments = find.filter(
      (animal) => animal.comments.length > 0,
    );
    const animalsWithoutComments = find.filter(
      (animal) => animal.comments.length === 0,
    );

    const animalsWithPercentage = animalsWithComments.map((animal) => {
      const commentCount = animal.comments.length;
      const percentage =
        total_comments > 0
          ? ((commentCount / total_comments) * 100).toFixed(2)
          : '0.00';

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
        (findZone?.length || 0) +
        (findSpecies?.length || 0) +
        (findAnimal?.length || 0) +
        (findCommentary?.length || 0) +
        (findResponseComment?.length || 0),
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

  async animalsCommentPerDay(): Promise<{
    animalsComments: AnimalCommentData[];
    userAnimalComment: UserAnimalComment[];
  }> {
    try {
      const { startOfDay, endOfDay } = this.getDayRange();

      const comments = await this.commentRepository.findAll({
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
            attributes: [
              'id',
              'comentario',
              'id_user',
              'fecha',
              'id_comentario_principal',
            ],
            required: false,
            include: [
              {
                model: User,
                as: 'userCreated',
                attributes: ['id', 'email'],
                required: false,
              },
            ],
          },
          {
            model: Animal,
            as: 'animal',
            attributes: ['id', 'nombre', 'id_user', 'id_especie'],
            required: true,
            include: [
              {
                model: Species,
                as: 'species',
                attributes: ['id', 'nombre', 'id_area'],
                required: false,
                include: [
                  {
                    model: Zone,
                    as: 'zone',
                    attributes: ['id', 'nombre'],
                    required: false,
                  },
                ],
              },
              {
                model: User,
                as: 'userCreated',
                attributes: ['id', 'email'],
                required: false,
              },
            ],
          },
          {
            model: User,
            as: 'userCreated',
            attributes: ['id', 'email'],
            required: false,
          },
        ],
        order: [['fecha', 'ASC']],
      });

      if (comments.length === 0) {
        this.logger.log('No hay comentarios para el día actual');
        return { animalsComments: [], userAnimalComment: [] };
      }

      const { mainComments, responseComments } =
        this.categorizeComments(comments);

      if (mainComments.length === 0) {
        this.logger.log('No hay comentarios principales para el día actual');
        return { animalsComments: [], userAnimalComment: [] };
      }

      const { processedComments, userCommentMap } = this.processCommentsData(
        mainComments,
        responseComments,
      );

      return {
        animalsComments: processedComments,
        userAnimalComment: Array.from(userCommentMap.values()),
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener comentarios del día: ${error.message}`,
      );
      throw new HttpException(
        'Error interno al obtener comentarios del día',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private categorizeComments(comments: Comment[]): {
    mainComments: Comment[];
    responseComments: Comment[];
  } {
    const mainComments = comments.filter(
      (comment) => !comment.id_comentario_principal,
    );

    const responseComments = comments.filter(
      (comment) => comment.id_comentario_principal,
    );

    return { mainComments, responseComments };
  }

  private processCommentsData(
    mainComments: Comment[],
    responseComments: Comment[],
  ): {
    processedComments: AnimalCommentData[];
    userCommentMap: Map<string, UserAnimalComment>;
  } {
    const userCommentMap = new Map<string, UserAnimalComment>();
    const processedComments: AnimalCommentData[] = [];

    for (const comment of mainComments) {
      try {
        const commentData = this.buildOptimizedCommentData(
          comment,
          responseComments,
        );

        if (commentData) {
          processedComments.push(commentData);

          const commentWithRelations = comment as any;
          const ownerId = commentWithRelations.animal?.id_user;
          const ownerEmail = commentWithRelations.animal?.userCreated?.email;

          if (ownerId && ownerEmail) {
            this.addToUserCommentMap(
              userCommentMap,
              ownerId,
              ownerEmail,
              commentData,
            );
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido';
        this.logger.warn(
          `Error procesando comentario ${comment.id}: ${errorMessage}`,
        );
        continue;
      }
    }

    return { processedComments, userCommentMap };
  }

  private addToUserCommentMap(
    userCommentMap: Map<string, UserAnimalComment>,
    ownerId: string,
    ownerEmail: string,
    commentData: AnimalCommentData,
  ): void {
    if (!userCommentMap.has(ownerId)) {
      userCommentMap.set(ownerId, {
        user: ownerId,
        email: ownerEmail,
        data: [],
      });
    }
    const userComment = userCommentMap.get(ownerId);
    if (userComment) {
      userComment.data.push(commentData);
    }
  }

  private buildOptimizedCommentData(
    comment: Comment,
    responseComments: Comment[],
  ): AnimalCommentData | null {
    try {
      const commentWithRelations = comment as any;

      if (!commentWithRelations.animal) {
        this.logger.warn(`Comentario ${comment.id} sin animal asociado`);
        return null;
      }

      const zona =
        commentWithRelations.animal.species?.zone?.nombre || 'Sin zona';
      const especie =
        commentWithRelations.animal.species?.nombre || 'Sin especie';
      const animalNombre = commentWithRelations.animal.nombre || 'Sin nombre';
      const autorEmail = commentWithRelations.userCreated?.email || 'Sin autor';

      const directResponses = responseComments.filter(
        (response) => response.id_comentario_principal === comment.id,
      );

      const commentarioBase = {
        id: String(comment.id),
        comentario: comment.comentario || '',
        autor: autorEmail,
        fecha: comment.fecha,
      };

      if (directResponses.length > 0) {
        const firstResponse = directResponses[0] as any;
        const responseAuthor = firstResponse.userCreated?.email || 'Sin autor';
        const principalId = firstResponse.id_comentario_principal;

        return {
          zona,
          specie: especie,
          animal: animalNombre,
          comentario: {
            ...commentarioBase,
            respuesta: {
              id: String(firstResponse.id),
              comentario: firstResponse.comentario || '',
              autor: responseAuthor,
              fecha: firstResponse.fecha,
              id_comentario_principal: principalId
                ? String(principalId)
                : undefined,
            },
          },
        };
      }

      return {
        zona,
        specie: especie,
        animal: animalNombre,
        comentario: commentarioBase,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al construir datos del comentario ${comment.id}: ${errorMessage}`,
      );
      return null;
    }
  }
}
