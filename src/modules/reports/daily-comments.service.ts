import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { dayRangeIn } from '../../common/utils/day-range';
import { Animal } from '../animals/animal.model';
import { Comment } from '../comments/comment.model';
import { DEFAULT_TIMEZONE } from '../indicators/indicators.service';
import { Species } from '../species/species.model';
import { User } from '../users/user.model';
import { Zone } from '../zones/zone.model';
import { ReportEntry, UserReport } from './report.types';

/**
 * Main comments written today (APP_TIMEZONE) grouped by the employee responsible for the
 * animal, each with its first reply of today.
 */
@Injectable()
export class DailyCommentsService {
  constructor(
    @InjectModel(Comment) private readonly comments: typeof Comment,
    private readonly config: ConfigService,
  ) {}

  async collect(now: Date = new Date()): Promise<UserReport[]> {
    const timeZone = this.config.get<string>('APP_TIMEZONE', DEFAULT_TIMEZONE);
    const { startOfDay, endOfDay } = dayRangeIn(timeZone, now);
    const today = { [Op.between]: [startOfDay, endOfDay] };

    const mainComments = await this.comments.findAll({
      where: { fecha: today, id_comentario_principal: null },
      include: [
        { model: User, attributes: ['id', 'email'] },
        {
          model: Comment,
          as: 'respuestas',
          required: false,
          where: { fecha: today },
          include: [{ model: User, attributes: ['id', 'email'] }],
        },
        {
          model: Animal,
          required: true,
          attributes: ['id', 'nombre', 'id_user'],
          include: [
            { model: User, attributes: ['id', 'email'] },
            {
              model: Species,
              attributes: ['id', 'nombre'],
              include: [{ model: Zone, attributes: ['id', 'nombre'] }],
            },
          ],
        },
      ],
      order: [
        ['fecha', 'ASC'],
        [{ model: Comment, as: 'respuestas' }, 'fecha', 'ASC'],
      ],
    });

    const reports = new Map<string, UserReport>();
    for (const comment of mainComments) {
      const owner = comment.animal.userCreated;
      if (!owner) {
        continue;
      }
      const report = reports.get(owner.id) ?? {
        user: owner.id,
        email: owner.email,
        data: [],
      };
      report.data.push(toEntry(comment));
      reports.set(owner.id, report);
    }
    return [...reports.values()];
  }
}

function toEntry(comment: Comment): ReportEntry {
  const reply = comment.respuestas?.[0];
  return {
    zona: comment.animal.species?.zone?.nombre ?? 'Sin zona',
    specie: comment.animal.species?.nombre ?? 'Sin especie',
    animal: comment.animal.nombre,
    comentario: {
      id: comment.id,
      comentario: comment.comentario,
      autor: comment.userCreated?.email ?? 'Sin autor',
      fecha: comment.fecha,
      ...(reply && {
        respuesta: {
          id: reply.id,
          comentario: reply.comentario,
          autor: reply.userCreated?.email ?? 'Sin autor',
          fecha: reply.fecha,
        },
      }),
    },
  };
}
