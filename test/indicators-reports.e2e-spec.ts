import { randomUUID } from 'crypto';
import { UserRole } from '../src/common/types/user-role';
import { DailyCommentsService } from '../src/modules/reports/daily-comments.service';
import {
  DailyReportService,
  REPORT_SUBJECT,
} from '../src/modules/reports/daily-report.service';
import {
  bearer,
  createTestApp,
  createUser,
  createZooData,
  describeWithDb,
  resetDatabase,
  TestApp,
  TestUser,
} from './support/test-app';

describeWithDb('Indicators and daily report (e2e)', () => {
  let t: TestApp;
  let keeper: TestUser;
  let visitor: TestUser;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(t);
    keeper = await createUser(t, UserRole.EMPLEADO, 'keeper@mail.com');
    visitor = await createUser(t, UserRole.USUARIO, 'visitor@mail.com');
  });
  afterAll(() => t.close());

  const get = (path: string) => t.http.get(path).set(bearer(visitor.token));
  const comment = (user: TestUser, body: object) =>
    t.http.post('/comentarios').set(bearer(user.token)).send(body).expect(201);

  describe('/indicadores', () => {
    it('require authentication (they were public)', async () => {
      await t.http.get('/indicadores/total-animales').expect(401);
      await t.http.get('/indicadores/query?search=a').expect(401);
    });

    it('empty database: 200 with [] and zeros instead of 404 or NaN', async () => {
      await get('/indicadores/total-animales').expect(200, []);
      await get('/indicadores/total-animales-especies').expect(200, []);
      await get('/indicadores/reporte-animales').expect(200, []);
      await get('/indicadores/porcentaje-comentarios-animales').expect(200, {
        animales: [],
        total_comentarios: 0,
        total_animales_con_comentarios: 0,
        total_animales_sin_comentarios: 0,
      });
      const replyRate = await get(
        '/indicadores/porcentaje-comentario-respuesta',
      ).expect(200);
      expect(replyRate.body.resumen).toEqual({
        total_comentarios_principales: 0,
        comentarios_con_respuestas: 0,
        comentarios_sin_respuestas: 0,
        porcentaje_con_respuestas: 0,
        porcentaje_sin_respuestas: 0,
      });
      const search = await get('/indicadores/query?search=leon').expect(200);
      expect(search.body).toEqual({
        termino_busqueda: 'leon',
        data: {
          total_resultado: 0,
          resultado: {
            zona: [],
            especie: [],
            animal: [],
            comentario: [],
            respuesta: [],
          },
        },
      });
    });

    it('counts animals per zone and per species; by id 404 when unknown, 400 when malformed', async () => {
      const data = await createZooData(t, keeper);
      await t.http
        .post('/animales')
        .set(bearer(keeper.token))
        .send({ nombre: 'Tigre', id_especie: data.speciesId })
        .expect(201);

      await get('/indicadores/total-animales').expect(200, [
        { id: data.zoneId, name: 'Zona 1', 'total animals': 2 },
      ]);
      await get(`/indicadores/total-animales/${data.zoneId}`).expect(200, [
        { name: 'Zona 1', 'total animals': 2 },
      ]);
      await get('/indicadores/total-animales-especies').expect(200, [
        { id: data.speciesId, nombre: 'Felinos 1', 'total animals': 2 },
      ]);
      await get(
        `/indicadores/total-animales-especies/${data.speciesId}`,
      ).expect(200);
      await get(`/indicadores/total-animales/${randomUUID()}`).expect(404);
      await get(`/indicadores/total-animales-especies/${randomUUID()}`).expect(
        404,
      );
      await get('/indicadores/total-animales/abc').expect(400);
    });

    it('comment share per animal and reply rate', async () => {
      const data = await createZooData(t, keeper);
      await t.http
        .post('/animales')
        .set(bearer(keeper.token))
        .send({ nombre: 'Tigre', id_especie: data.speciesId })
        .expect(201);
      const main = await comment(visitor, {
        comentario: 'Primer comentario del leon',
        id_animal: data.animalId,
      });
      await comment(visitor, {
        comentario: 'Segundo comentario del leon',
        id_animal: data.animalId,
      });
      await comment(keeper, {
        comentario: 'Respuesta del cuidador',
        id_animal: data.animalId,
        id_comentario_principal: main.body.id,
      });

      const share = await get(
        '/indicadores/porcentaje-comentarios-animales',
      ).expect(200);
      expect(share.body).toEqual(
        expect.objectContaining({
          total_comentarios: 3,
          total_animales_con_comentarios: 1,
          total_animales_sin_comentarios: 1,
        }),
      );
      expect(share.body.animales[0]).toEqual(
        expect.objectContaining({
          nombre: 'Leon 1',
          total_comentarios: 3,
          porcentaje_comentarios: 100,
        }),
      );

      const rate = await get(
        '/indicadores/porcentaje-comentario-respuesta',
      ).expect(200);
      expect(rate.body.resumen).toEqual({
        total_comentarios_principales: 2,
        comentarios_con_respuestas: 1,
        comentarios_sin_respuestas: 1,
        porcentaje_con_respuestas: 50,
        porcentaje_sin_respuestas: 50,
      });
    });

    it('search: 400 without a term; finds every category; % and _ are literal', async () => {
      const data = await createZooData(t, keeper);
      const main = await comment(visitor, {
        comentario: 'El leon esta al 100% hoy',
        id_animal: data.animalId,
      });
      await comment(keeper, {
        comentario: 'Gracias, el leon come bien',
        id_animal: data.animalId,
        id_comentario_principal: main.body.id,
      });

      await get('/indicadores/query').expect(400);
      await get('/indicadores/query?search=%20').expect(400);
      const leon = await get('/indicadores/query?search=LEON').expect(200);
      expect(leon.body.data.total_resultado).toBe(3);
      expect(leon.body.data.resultado.animal).toHaveLength(1);
      expect(leon.body.data.resultado.comentario).toHaveLength(1);
      expect(leon.body.data.resultado.respuesta).toHaveLength(1);
      const percent = await get('/indicadores/query?search=%25').expect(200);
      expect(percent.body.data.total_resultado).toBe(1);
      const underscore = await get('/indicadores/query?search=_').expect(200);
      expect(underscore.body.data.total_resultado).toBe(0);
    });

    it('animals registered today', async () => {
      const data = await createZooData(t, keeper);
      await t.sequelize.query(
        `INSERT INTO animals (id, nombre, id_especie, id_user, fecha) VALUES (:id, 'Viejo', :sp, :u, now() - interval '3 days')`,
        {
          replacements: { id: randomUUID(), sp: data.speciesId, u: keeper.id },
        },
      );

      await get('/indicadores/reporte-animales')
        .expect(200)
        .expect(({ body }) =>
          expect(body).toEqual([
            {
              nombre: 'Leon 1',
              id_usuario: keeper.id,
              fecha: expect.any(String),
              especies: {
                id: data.speciesId,
                nombre: 'Felinos 1',
                area: { id: data.zoneId, nombre: 'Zona 1' },
              },
            },
          ]),
        );
    });
  });

  describe('daily report', () => {
    it("groups today's main comments by the responsible employee, with the first reply", async () => {
      const otherKeeper = await createUser(
        t,
        UserRole.EMPLEADO,
        'other@mail.com',
      );
      const data = await createZooData(t, keeper);
      const other = await createZooData(t, otherKeeper, '2');
      const main = await comment(visitor, {
        comentario: 'Comentario sobre el leon',
        id_animal: data.animalId,
      });
      await comment(keeper, {
        comentario: 'Respuesta del cuidador',
        id_animal: data.animalId,
        id_comentario_principal: main.body.id,
      });
      await comment(visitor, {
        comentario: 'Comentario sobre el otro',
        id_animal: other.animalId,
      });
      await t.sequelize.query(
        `INSERT INTO comments (id, comentario, id_animal, id_user, fecha) VALUES (:id, 'De hace dos dias', :a, :u, now() - interval '2 days')`,
        { replacements: { id: randomUUID(), a: data.animalId, u: visitor.id } },
      );

      const reports = await t.app.get(DailyCommentsService).collect();
      const byEmail = Object.fromEntries(reports.map((r) => [r.email, r]));

      expect(Object.keys(byEmail).sort()).toEqual([
        'keeper@mail.com',
        'other@mail.com',
      ]);
      expect(byEmail['keeper@mail.com'].data).toEqual([
        {
          zona: 'Zona 1',
          specie: 'Felinos 1',
          animal: 'Leon 1',
          comentario: expect.objectContaining({
            comentario: 'Comentario sobre el leon',
            autor: 'visitor@mail.com',
            respuesta: expect.objectContaining({
              comentario: 'Respuesta del cuidador',
              autor: 'keeper@mail.com',
            }),
          }),
        },
      ]);
      expect(byEmail['other@mail.com'].data).toHaveLength(1);
    });

    it('uses the Bogotá calendar day: a comment at 20:00 Bogotá (01:00 UTC next day) is "today"', async () => {
      const data = await createZooData(t, keeper);
      await t.sequelize.query(
        `INSERT INTO comments (id, comentario, id_animal, id_user, fecha) VALUES (:id, 'Comentario nocturno', :a, :u, '2026-03-11T01:00:00Z')`,
        { replacements: { id: randomUUID(), a: data.animalId, u: visitor.id } },
      );

      const lateEvening = await t.app
        .get(DailyCommentsService)
        .collect(new Date('2026-03-11T04:00:00Z'));
      const nextDay = await t.app
        .get(DailyCommentsService)
        .collect(new Date('2026-03-11T06:00:00Z'));

      expect(lateEvening).toHaveLength(1);
      expect(nextDay).toHaveLength(0);
    });

    it('uploads an Excel and a PDF per employee and queues one e-mail with both', async () => {
      const data = await createZooData(t, keeper);
      await comment(visitor, {
        comentario: 'Comentario para el reporte',
        id_animal: data.animalId,
      });

      const result = await t.app.get(DailyReportService).run();

      expect(result).toEqual({ sent: 1, failed: 0 });
      expect(t.fakes.storage.upload).toHaveBeenCalledTimes(2);
      const [message] = t.fakes.messaging.publish.mock.calls[0];
      expect(message).toEqual(
        expect.objectContaining({
          type: 'email_notification',
          data: expect.objectContaining({
            recipients: 'keeper@mail.com',
            subject: REPORT_SUBJECT,
            userId: keeper.id,
            attachments: [
              {
                name_file: expect.stringMatching(/\.xlsx$/),
                s3_name: expect.any(String),
              },
              {
                name_file: expect.stringMatching(/\.pdf$/),
                s3_name: expect.any(String),
              },
            ],
          }),
        }),
      );
    });

    it("a failed publish deletes that employee's uploads and does not stop the others", async () => {
      const otherKeeper = await createUser(
        t,
        UserRole.EMPLEADO,
        'other@mail.com',
      );
      const data = await createZooData(t, keeper);
      const other = await createZooData(t, otherKeeper, '2');
      await comment(visitor, {
        comentario: 'Comentario uno',
        id_animal: data.animalId,
      });
      await comment(visitor, {
        comentario: 'Comentario dos',
        id_animal: other.animalId,
      });
      t.fakes.messaging.publish.mockRejectedValueOnce(new Error('broker down'));

      const result = await t.app.get(DailyReportService).run();

      expect(result).toEqual({ sent: 1, failed: 1 });
      expect(t.fakes.storage.upload).toHaveBeenCalledTimes(4);
      expect(t.fakes.storage.delete).toHaveBeenCalledTimes(2);
      expect(t.fakes.messaging.publish).toHaveBeenCalledTimes(2);
    });

    it('a failed upload removes the file already uploaded', async () => {
      const data = await createZooData(t, keeper);
      await comment(visitor, {
        comentario: 'Comentario uno',
        id_animal: data.animalId,
      });
      t.fakes.storage.upload
        .mockResolvedValueOnce('first-key')
        .mockRejectedValueOnce(new Error('R2 down'));

      await expect(t.app.get(DailyReportService).run()).resolves.toEqual({
        sent: 0,
        failed: 1,
      });
      expect(t.fakes.storage.delete).toHaveBeenCalledWith('first-key');
      expect(t.fakes.messaging.publish).not.toHaveBeenCalled();
    });

    it('nothing to send when there are no comments today', async () => {
      await expect(t.app.get(DailyReportService).run()).resolves.toEqual({
        sent: 0,
        failed: 0,
      });
      expect(t.fakes.messaging.publish).not.toHaveBeenCalled();
    });
  });
});
