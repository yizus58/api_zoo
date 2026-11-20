import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { dayRangeIn } from '../../common/utils/day-range';
import { containsPattern } from '../../common/utils/like';
import { Animal } from '../animals/animal.model';
import { Comment } from '../comments/comment.model';
import { Species } from '../species/species.model';
import { Zone } from '../zones/zone.model';
import {
  AnimalRegisteredToday,
  CommentAnalysisResponse,
  CommentStatsResponse,
  SearchResponse,
  SpeciesIndicator,
  ZoneIndicator,
} from './indicators.types';

export const DEFAULT_TIMEZONE = 'America/Bogota';

const percentage = (part: number, total: number): number =>
  total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0;

@Injectable()
export class IndicatorsService {
  constructor(
    @InjectModel(Animal) private readonly animals: typeof Animal,
    @InjectModel(Comment) private readonly comments: typeof Comment,
    @InjectModel(Species) private readonly species: typeof Species,
    @InjectModel(Zone) private readonly zones: typeof Zone,
    private readonly config: ConfigService,
  ) {}

  /** Animals per zone. With an id: that zone only (404 if unknown) and without the id field. */
  async totalAnimalsByZone(id?: string): Promise<ZoneIndicator[]> {
    const zones = await this.zones.findAll({
      attributes: ['id', 'nombre'],
      where: id ? { id } : {},
      include: [
        {
          model: Species,
          attributes: ['id'],
          include: [{ model: Animal, attributes: ['id'] }],
        },
      ],
      order: [['nombre', 'ASC']],
    });
    if (id && zones.length === 0) {
      throw new NotFoundException('No se encontró la zona especificada');
    }

    return zones.map((zone) => {
      const total = (zone.species ?? []).reduce(
        (sum, species) => sum + (species.animals?.length ?? 0),
        0,
      );
      return id
        ? { name: zone.nombre, 'total animals': total }
        : { id: zone.id, name: zone.nombre, 'total animals': total };
    });
  }

  /** Animals per species. With an id: that species only (404 if unknown). */
  async totalAnimalsBySpecies(id?: string): Promise<SpeciesIndicator[]> {
    const species = await this.species.findAll({
      attributes: ['id', 'nombre'],
      where: id ? { id } : {},
      include: [{ model: Animal, attributes: ['id'] }],
      order: [['nombre', 'ASC']],
    });
    if (id && species.length === 0) {
      throw new NotFoundException('La especie especificada no existe');
    }
    return species.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      'total animals': item.animals?.length ?? 0,
    }));
  }

  /** Share of all comments that each animal received (animals without comments are only counted). */
  async commentShareByAnimal(): Promise<CommentStatsResponse> {
    const animals = await this.animals.findAll({
      attributes: ['id', 'nombre'],
      include: [
        {
          model: Comment,
          attributes: ['id', 'comentario', 'id_user', 'fecha'],
        },
      ],
    });

    const total = animals.reduce(
      (sum, animal) => sum + animal.comments.length,
      0,
    );
    const withComments = animals.filter((animal) => animal.comments.length > 0);

    return {
      animales: withComments
        .map((animal) => ({
          id: animal.id,
          nombre: animal.nombre,
          total_comentarios: animal.comments.length,
          porcentaje_comentarios: percentage(animal.comments.length, total),
          comentarios: animal.comments,
        }))
        .sort((a, b) => b.porcentaje_comentarios - a.porcentaje_comentarios),
      total_comentarios: total,
      total_animales_con_comentarios: withComments.length,
      total_animales_sin_comentarios: animals.length - withComments.length,
    };
  }

  /** How many main comments got at least one reply. All zeros when there are none. */
  async replyRate(): Promise<CommentAnalysisResponse> {
    const mainComments = await this.comments.findAll({
      where: { id_comentario_principal: null },
      attributes: ['id', 'comentario', 'fecha'],
      include: [
        {
          model: Comment,
          as: 'respuestas',
          attributes: ['id', 'comentario', 'fecha'],
        },
        { model: Animal, attributes: ['id', 'nombre'] },
      ],
      order: [['fecha', 'ASC']],
    });

    const answered = mainComments.filter(
      (comment) => comment.respuestas.length > 0,
    );
    const unanswered = mainComments.filter(
      (comment) => comment.respuestas.length === 0,
    );
    const total = mainComments.length;
    const summary = (comment: Comment) => ({
      id: comment.id,
      comentario: comment.comentario,
      animal: comment.animal?.nombre ?? 'Sin animal',
      totalRespuestas: comment.respuestas.length,
      respuestas: comment.respuestas,
    });

    const answeredPct = percentage(answered.length, total);
    const unansweredPct = percentage(unanswered.length, total);

    return {
      estadisticas: [
        {
          categoria: 'Comentarios con respuestas',
          cantidad: answered.length,
          porcentaje: answeredPct,
          comentarios: answered.map(summary),
        },
        {
          categoria: 'Comentarios sin respuestas',
          cantidad: unanswered.length,
          porcentaje: unansweredPct,
          comentarios: unanswered.map(summary),
        },
      ].sort((a, b) => b.porcentaje - a.porcentaje),
      resumen: {
        total_comentarios_principales: total,
        comentarios_con_respuestas: answered.length,
        comentarios_sin_respuestas: unanswered.length,
        porcentaje_con_respuestas: answeredPct,
        porcentaje_sin_respuestas: unansweredPct,
      },
    };
  }

  /** Case-insensitive "contains" search; wildcards in the term are matched literally. */
  async search(term: string): Promise<SearchResponse> {
    const pattern = { [Op.iLike]: containsPattern(term) };
    const byName = { nombre: pattern } as WhereOptions;

    const [zona, especie, animal, comentario, respuesta] = await Promise.all([
      this.zones.findAll({ where: byName }),
      this.species.findAll({ where: byName }),
      this.animals.findAll({ where: byName }),
      this.comments.findAll({
        where: {
          comentario: pattern,
          id_comentario_principal: { [Op.is]: null },
        },
      }),
      this.comments.findAll({
        where: {
          comentario: pattern,
          id_comentario_principal: { [Op.ne]: null },
        },
      }),
    ]);

    return {
      termino_busqueda: term,
      data: {
        total_resultado:
          zona.length +
          especie.length +
          animal.length +
          comentario.length +
          respuesta.length,
        resultado: { zona, especie, animal, comentario, respuesta },
      },
    };
  }

  /** Animals registered today, "today" being the calendar day in APP_TIMEZONE. */
  async animalsRegisteredToday(
    now: Date = new Date(),
  ): Promise<AnimalRegisteredToday[]> {
    const { startOfDay, endOfDay } = dayRangeIn(this.timeZone(), now);
    const animals = await this.animals.findAll({
      attributes: ['nombre', 'id_user', 'fecha'],
      where: { fecha: { [Op.between]: [startOfDay, endOfDay] } },
      include: [
        {
          model: Species,
          attributes: ['id', 'nombre'],
          include: [{ model: Zone, attributes: ['id', 'nombre'] }],
        },
      ],
      order: [['fecha', 'ASC']],
    });

    return animals.map((animal) => ({
      nombre: animal.nombre,
      id_usuario: animal.id_user,
      fecha: animal.fecha,
      especies: animal.species
        ? {
            id: animal.species.id,
            nombre: animal.species.nombre,
            area: animal.species.zone
              ? {
                  id: animal.species.zone.id,
                  nombre: animal.species.zone.nombre,
                }
              : null,
          }
        : null,
    }));
  }

  private timeZone(): string {
    return this.config.get<string>('APP_TIMEZONE', DEFAULT_TIMEZONE);
  }
}
