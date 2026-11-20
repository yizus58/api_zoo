import { randomUUID } from 'crypto';
import { UserRole } from '../src/common/types/user-role';
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

describeWithDb('Animals and comments (e2e)', () => {
  let t: TestApp;
  let keeper: TestUser;
  let otherKeeper: TestUser;
  let visitor: TestUser;
  let data: { zoneId: string; speciesId: string; animalId: string };

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(t);
    keeper = await createUser(t, UserRole.EMPLEADO, 'keeper@mail.com');
    otherKeeper = await createUser(t, UserRole.EMPLEADO, 'other@mail.com');
    visitor = await createUser(t, UserRole.USUARIO, 'visitor@mail.com');
    data = await createZooData(t, keeper);
  });
  afterAll(() => t.close());

  const comment = (user: TestUser, body: object) =>
    t.http.post('/comentarios').set(bearer(user.token)).send(body);

  describe('/animales', () => {
    it('empty list is 200 []', async () => {
      await t.sequelize.query('TRUNCATE animals CASCADE');
      await t.http.get('/animales').set(bearer(visitor.token)).expect(200, []);
    });

    it('create: 201, the caller becomes responsible and the server sets the date', async () => {
      const response = await t.http
        .post('/animales')
        .set(bearer(keeper.token))
        .send({
          nombre: 'Tigre',
          id_especie: data.speciesId,
          id_user: otherKeeper.id,
          fecha: '2000-01-01',
        })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          nombre: 'Tigre',
          id_especie: data.speciesId,
          id_user: keeper.id,
        }),
      );
      expect(new Date(response.body.fecha).getFullYear()).toBeGreaterThan(2000);
    });

    it('create: 409 taken name, 404 unknown species, 400 invalid body, 403 for USUARIO', async () => {
      await t.http
        .post('/animales')
        .set(bearer(keeper.token))
        .send({ nombre: 'Leon 1', id_especie: data.speciesId })
        .expect(409);
      await t.http
        .post('/animales')
        .set(bearer(keeper.token))
        .send({ nombre: 'Tigre', id_especie: randomUUID() })
        .expect(404);
      await t.http
        .post('/animales')
        .set(bearer(keeper.token))
        .send({ nombre: 'T' })
        .expect(400);
      await t.http
        .post('/animales')
        .set(bearer(visitor.token))
        .send({ nombre: 'Tigre', id_especie: data.speciesId })
        .expect(403);
    });

    it('list and read show species and responsible e-mail', async () => {
      const expected = {
        id: data.animalId,
        nombre: 'Leon 1',
        fecha: expect.any(String),
        species: { nombre: 'Felinos 1' },
        userCreated: { email: 'keeper@mail.com' },
      };
      await t.http
        .get('/animales')
        .set(bearer(visitor.token))
        .expect(200)
        .expect(({ body }) => expect(body).toEqual([expected]));
      await t.http
        .get(`/animales/${data.animalId}`)
        .set(bearer(visitor.token))
        .expect(200)
        .expect(({ body }) => expect(body).toEqual(expected));
      await t.http
        .get(`/animales/${randomUUID()}`)
        .set(bearer(visitor.token))
        .expect(404);
      await t.http.get('/animales/123').set(bearer(visitor.token)).expect(400);
    });

    it('update: only the responsible employee (403 otherwise); 409 for another animal name (was 500)', async () => {
      await t.http
        .post('/animales')
        .set(bearer(keeper.token))
        .send({ nombre: 'Tigre', id_especie: data.speciesId })
        .expect(201);

      const ok = await t.http
        .put(`/animales/${data.animalId}`)
        .set(bearer(keeper.token))
        .send({ nombre: 'Leon renombrado', id_especie: data.speciesId })
        .expect(200);
      expect(ok.body).toEqual(
        expect.objectContaining({
          id: data.animalId,
          nombre: 'Leon renombrado',
          id_user: keeper.id,
        }),
      );
      await t.http
        .put(`/animales/${data.animalId}`)
        .set(bearer(keeper.token))
        .send({ nombre: 'Tigre', id_especie: data.speciesId })
        .expect(409);
      await t.http
        .put(`/animales/${data.animalId}`)
        .set(bearer(otherKeeper.token))
        .send({ nombre: 'Robado', id_especie: data.speciesId })
        .expect(403);
      await t.http
        .put(`/animales/${data.animalId}`)
        .set(bearer(keeper.token))
        .send({ nombre: 'Leon', id_especie: randomUUID() })
        .expect(404);
      await t.http
        .put(`/animales/${randomUUID()}`)
        .set(bearer(keeper.token))
        .send({ nombre: 'Leon', id_especie: data.speciesId })
        .expect(404);
    });

    it('delete: responsible employee only; removes the comments and replies too', async () => {
      const main = await comment(visitor, {
        comentario: 'Un comentario de prueba',
        id_animal: data.animalId,
      }).expect(201);
      await comment(keeper, {
        comentario: 'Respuesta del cuidador',
        id_animal: data.animalId,
        id_comentario_principal: main.body.id,
      }).expect(201);

      await t.http
        .delete(`/animales/${data.animalId}`)
        .set(bearer(otherKeeper.token))
        .expect(403);
      await t.http
        .delete(`/animales/${data.animalId}`)
        .set(bearer(keeper.token))
        .expect(204);
      await t.http
        .get(`/animales/${data.animalId}`)
        .set(bearer(keeper.token))
        .expect(404);
      await t.http
        .get('/comentarios')
        .set(bearer(keeper.token))
        .expect(200, []);
      await t.http
        .delete(`/animales/${data.animalId}`)
        .set(bearer(keeper.token))
        .expect(404);
    });
  });

  describe('/comentarios', () => {
    it('empty list is 200 [] (all and by animal)', async () => {
      await t.http
        .get('/comentarios')
        .set(bearer(visitor.token))
        .expect(200, []);
      await t.http
        .get(`/comentarios/${data.animalId}`)
        .set(bearer(visitor.token))
        .expect(200, []);
    });

    it('any role comments (201) and replies; listing by animal nests the replies', async () => {
      const main = await comment(visitor, {
        comentario: 'Que hermoso leon tienen',
        id_animal: data.animalId,
      }).expect(201);
      expect(main.body).toEqual(
        expect.objectContaining({
          id_user: visitor.id,
          id_animal: data.animalId,
          id_comentario_principal: null,
        }),
      );
      await comment(keeper, {
        comentario: 'Gracias por la visita!',
        id_animal: data.animalId,
        id_comentario_principal: main.body.id,
      }).expect(201);

      const byAnimal = await t.http
        .get(`/comentarios/${data.animalId}`)
        .set(bearer(visitor.token))
        .expect(200);
      expect(byAnimal.body).toEqual([
        {
          id: main.body.id,
          comentario: 'Que hermoso leon tienen',
          fecha: expect.any(String),
          animal: { nombre: 'Leon 1' },
          userCreated: { email: 'visitor@mail.com' },
          respuestas: [
            {
              id: expect.any(String),
              comentario: 'Gracias por la visita!',
              fecha: expect.any(String),
              userCreated: { email: 'keeper@mail.com' },
            },
          ],
        },
      ]);
      const all = await t.http
        .get('/comentarios')
        .set(bearer(visitor.token))
        .expect(200);
      expect(all.body).toHaveLength(2);
      expect(all.body[1].comentarioPrincipal).toEqual({
        comentario: 'Que hermoso leon tienen',
      });
    });

    it('create errors: 404 animal (was 403), 404 parent, 400 reply to a reply, 400 parent of another animal, 400 short text', async () => {
      const second = await t.http
        .post('/animales')
        .set(bearer(keeper.token))
        .send({ nombre: 'Tigre', id_especie: data.speciesId })
        .expect(201);
      const main = await comment(visitor, {
        comentario: 'Comentario principal',
        id_animal: data.animalId,
      }).expect(201);
      const reply = await comment(keeper, {
        comentario: 'Respuesta al principal',
        id_animal: data.animalId,
        id_comentario_principal: main.body.id,
      }).expect(201);

      await comment(visitor, {
        comentario: 'Animal que no existe',
        id_animal: randomUUID(),
      }).expect(404);
      await comment(visitor, {
        comentario: 'Padre que no existe',
        id_animal: data.animalId,
        id_comentario_principal: randomUUID(),
      }).expect(404);
      const nested = await comment(visitor, {
        comentario: 'Respuesta a respuesta',
        id_animal: data.animalId,
        id_comentario_principal: reply.body.id,
      }).expect(400);
      expect(nested.body.message).toBe(
        'Solo se puede responder a un comentario principal',
      );
      const crossed = await comment(visitor, {
        comentario: 'De otro animal distinto',
        id_animal: second.body.id,
        id_comentario_principal: main.body.id,
      }).expect(400);
      expect(crossed.body.message).toBe(
        'El comentario principal pertenece a otro animal',
      );
      await comment(visitor, {
        comentario: 'corto',
        id_animal: data.animalId,
      }).expect(400);
      await t.http
        .get(`/comentarios/${randomUUID()}`)
        .set(bearer(visitor.token))
        .expect(404);
    });

    it('update: only the author, only the text (403 for others instead of 401)', async () => {
      const second = await t.http
        .post('/animales')
        .set(bearer(keeper.token))
        .send({ nombre: 'Tigre', id_especie: data.speciesId })
        .expect(201);
      const main = await comment(visitor, {
        comentario: 'Texto original largo',
        id_animal: data.animalId,
      }).expect(201);

      const updated = await t.http
        .put(`/comentarios/${main.body.id}`)
        .set(bearer(visitor.token))
        .send({
          comentario: 'Texto corregido largo',
          id_animal: second.body.id,
        })
        .expect(200);
      expect(updated.body).toEqual(
        expect.objectContaining({
          comentario: 'Texto corregido largo',
          id_animal: data.animalId,
        }),
      );
      await t.http
        .put(`/comentarios/${main.body.id}`)
        .set(bearer(keeper.token))
        .send({ comentario: 'Intento de otro usuario' })
        .expect(403);
      await t.http
        .put(`/comentarios/${randomUUID()}`)
        .set(bearer(visitor.token))
        .send({ comentario: 'No existe este comentario' })
        .expect(404);
      await t.http
        .put(`/comentarios/${main.body.id}`)
        .set(bearer(visitor.token))
        .send({ comentario: 'corto' })
        .expect(400);
    });

    it('delete: author, ADMIN or EMPLEADO; replies go with the comment; 403 other USUARIO; 404', async () => {
      const otherVisitor = await createUser(t, UserRole.USUARIO);
      const first = await comment(visitor, {
        comentario: 'Primer comentario aqui',
        id_animal: data.animalId,
      }).expect(201);
      await comment(keeper, {
        comentario: 'Respuesta al primero',
        id_animal: data.animalId,
        id_comentario_principal: first.body.id,
      }).expect(201);
      const second = await comment(visitor, {
        comentario: 'Segundo comentario aqui',
        id_animal: data.animalId,
      }).expect(201);

      await t.http
        .delete(`/comentarios/${first.body.id}`)
        .set(bearer(otherVisitor.token))
        .expect(403);
      await t.http
        .delete(`/comentarios/${first.body.id}`)
        .set(bearer(visitor.token))
        .expect(204);
      await t.http
        .delete(`/comentarios/${second.body.id}`)
        .set(bearer(otherKeeper.token))
        .expect(204);
      await t.http
        .get('/comentarios')
        .set(bearer(visitor.token))
        .expect(200, []);
      await t.http
        .delete(`/comentarios/${second.body.id}`)
        .set(bearer(visitor.token))
        .expect(404);
    });
  });
});
