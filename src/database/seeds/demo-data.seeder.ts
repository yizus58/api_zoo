import {
  randAnimal,
  randBetweenDate,
  randCompanyName,
  randEmail,
  randFirstName,
  randLastName,
  randNumber,
  randParagraph,
  randWord,
} from '@ngneat/falso';
import * as bcrypt from 'bcrypt';
import { Sequelize } from 'sequelize-typescript';
import { UserRole } from '../../common/types/user-role';
import { Animal } from '../../modules/animals/animal.model';
import { Comment } from '../../modules/comments/comment.model';
import { Species } from '../../modules/species/species.model';
import { User } from '../../modules/users/user.model';
import { BCRYPT_ROUNDS } from '../../modules/users/users.service';
import { Zone } from '../../modules/zones/zone.model';

export interface DemoSeedOptions {
  employees: number;
  zones: number;
  speciesPerZone: number;
  animalsPerSpecies: number;
  commentsPerAnimal: number;
  employeePassword: string;
  /** Deletes all zones, species, animals, comments and non-admin users first. */
  reset: boolean;
}

export interface DemoSeedResult {
  skipped: boolean;
  employees: number;
  zones: number;
  species: number;
  animals: number;
  comments: number;
  replies: number;
}

const pick = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

/**
 * Random demo data for local development, run only on demand (npm run db:seed). It used to
 * run on every start and wipe the database; now it refuses to touch a database that already
 * has zones unless reset is requested explicitly.
 */
export async function seedDemoData(
  sequelize: Sequelize,
  options: DemoSeedOptions,
): Promise<DemoSeedResult> {
  return sequelize.transaction(async (transaction) => {
    if (options.reset) {
      await Comment.destroy({ where: {}, transaction });
      await Animal.destroy({ where: {}, transaction });
      await Species.destroy({ where: {}, transaction });
      await Zone.destroy({ where: {}, transaction });
      await User.destroy({
        where: { role: [UserRole.EMPLEADO, UserRole.USUARIO] },
        transaction,
      });
    } else if ((await Zone.count({ transaction })) > 0) {
      return {
        skipped: true,
        employees: 0,
        zones: 0,
        species: 0,
        animals: 0,
        comments: 0,
        replies: 0,
      };
    }

    const password = await bcrypt.hash(options.employeePassword, BCRYPT_ROUNDS);
    const employees: User[] = [];
    for (let i = 0; i < options.employees; i++) {
      employees.push(
        await User.create(
          {
            email: `demo.${i + 1}.${randEmail()}`.toLowerCase(),
            password,
            role: UserRole.EMPLEADO,
          },
          { transaction },
        ),
      );
    }

    const zones: Zone[] = [];
    for (let i = 0; i < options.zones; i++) {
      zones.push(
        await Zone.create(
          {
            nombre: `${randWord()} ${randCompanyName()} ${i + 1}`.substring(
              0,
              255,
            ),
          },
          { transaction },
        ),
      );
    }

    const species: Species[] = [];
    for (const zone of zones) {
      for (let i = 0; i < options.speciesPerZone; i++) {
        species.push(
          await Species.create(
            {
              nombre:
                `${randAnimal()} ${randWord()} ${species.length + 1}`.substring(
                  0,
                  255,
                ),
              id_area: zone.id,
            },
            { transaction },
          ),
        );
      }
    }

    const animals: Animal[] = [];
    for (const item of species) {
      for (let i = 0; i < options.animalsPerSpecies; i++) {
        animals.push(
          await Animal.create(
            {
              nombre:
                `${randFirstName()} ${randLastName()} ${animals.length + 1}`.substring(
                  0,
                  255,
                ),
              id_especie: item.id,
              id_user: pick(employees).id,
              fecha: randBetweenDate({
                from: new Date(Date.now() - 30 * 86400000),
                to: new Date(),
              }),
            },
            { transaction },
          ),
        );
      }
    }

    let comments = 0;
    let replies = 0;
    for (const animal of animals) {
      const commenters = employees.filter(
        (employee) => employee.id !== animal.id_user,
      );
      if (commenters.length === 0) {
        continue;
      }
      for (let i = 0; i < options.commentsPerAnimal; i++) {
        const comment = await Comment.create(
          {
            comentario: randParagraph({
              length: randNumber({ min: 1, max: 3 }),
            }).join(' '),
            id_animal: animal.id,
            id_user: pick(commenters).id,
            fecha: randBetweenDate({ from: animal.fecha, to: new Date() }),
          },
          { transaction },
        );
        comments++;
        // The responsible employee answers about half of the comments.
        if (Math.random() < 0.5) {
          await Comment.create(
            {
              comentario: randParagraph({ length: 1 }).join(' '),
              id_animal: animal.id,
              id_user: animal.id_user,
              id_comentario_principal: comment.id,
              fecha: randBetweenDate({ from: comment.fecha, to: new Date() }),
            },
            { transaction },
          );
          replies++;
        }
      }
    }

    return {
      skipped: false,
      employees: employees.length,
      zones: zones.length,
      species: species.length,
      animals: animals.length,
      comments,
      replies,
    };
  });
}
