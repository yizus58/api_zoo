import { randomUUID } from 'crypto';
import { UserRole } from '../src/common/types/user-role';
import {
  adminToken,
  bearer,
  createTestApp,
  createUser,
  createZooData,
  describeWithDb,
  resetDatabase,
  TestApp,
  TestUser,
} from './support/test-app';

describeWithDb('Zones and species (e2e)', () => {
  let t: TestApp;
  let admin: string;
  let employee: TestUser;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(t);
    admin = await adminToken(t);
    employee = await createUser(t, UserRole.EMPLEADO);
  });
  afterAll(() => t.close());

  describe('/areas', () => {
    it('empty list is 200 []', async () => {
      await t.http.get('/areas').set(bearer(employee.token)).expect(200, []);
    });

    it('admin creates (201), lists and reads a zone with its species and animals', async () => {
      const { zoneId, speciesId, animalId } = await createZooData(t, employee);

      const list = await t.http
        .get('/areas')
        .set(bearer(employee.token))
        .expect(200);
      expect(list.body).toEqual([
        {
          id: zoneId,
          nombre: 'Zona 1',
          species: [
            {
              id: speciesId,
              nombre: 'Felinos 1',
              animals: [{ id: animalId, nombre: 'Leon 1' }],
            },
          ],
        },
      ]);
      const one = await t.http
        .get(`/areas/${zoneId}`)
        .set(bearer(employee.token))
        .expect(200);
      expect(one.body).toEqual(list.body[0]);
    });

    it('create: 409 for a taken name, 400 for an invalid name, 403 for non admins', async () => {
      await t.http
        .post('/areas')
        .set(bearer(admin))
        .send({ nombre: 'Sabana' })
        .expect(201);
      await t.http
        .post('/areas')
        .set(bearer(admin))
        .send({ nombre: ' Sabana ' })
        .expect(409);
      await t.http
        .post('/areas')
        .set(bearer(admin))
        .send({ nombre: 'ab' })
        .expect(400);
      await t.http
        .post('/areas')
        .set(bearer(employee.token))
        .send({ nombre: 'Selva' })
        .expect(403);
    });

    it('read: 404 unknown id, 400 malformed id', async () => {
      await t.http.get(`/areas/${randomUUID()}`).set(bearer(admin)).expect(404);
      await t.http.get('/areas/not-a-uuid').set(bearer(admin)).expect(400);
    });

    it('update: 200 with the zone, keeps its own name, 409 for another zone name, 404 unknown', async () => {
      const a = await t.http
        .post('/areas')
        .set(bearer(admin))
        .send({ nombre: 'Sabana' })
        .expect(201);
      await t.http
        .post('/areas')
        .set(bearer(admin))
        .send({ nombre: 'Selva' })
        .expect(201);

      const renamed = await t.http
        .put(`/areas/${a.body.id}`)
        .set(bearer(admin))
        .send({ nombre: 'Desierto' })
        .expect(200);
      expect(renamed.body).toEqual({ id: a.body.id, nombre: 'Desierto' });
      await t.http
        .put(`/areas/${a.body.id}`)
        .set(bearer(admin))
        .send({ nombre: 'Desierto' })
        .expect(200);
      await t.http
        .put(`/areas/${a.body.id}`)
        .set(bearer(admin))
        .send({ nombre: 'Selva' })
        .expect(409);
      await t.http
        .put(`/areas/${randomUUID()}`)
        .set(bearer(admin))
        .send({ nombre: 'Otra' })
        .expect(404);
      await t.http
        .put(`/areas/${a.body.id}`)
        .set(bearer(employee.token))
        .send({ nombre: 'Otra' })
        .expect(403);
    });

    it('delete: 204, 409 while it has species, 404 unknown', async () => {
      const { zoneId } = await createZooData(t, employee);
      const empty = await t.http
        .post('/areas')
        .set(bearer(admin))
        .send({ nombre: 'Vacia' })
        .expect(201);

      await t.http.delete(`/areas/${zoneId}`).set(bearer(admin)).expect(409);
      await t.http
        .delete(`/areas/${empty.body.id}`)
        .set(bearer(admin))
        .expect(204);
      await t.http
        .delete(`/areas/${empty.body.id}`)
        .set(bearer(admin))
        .expect(404);
      await t.http
        .delete(`/areas/${zoneId}`)
        .set(bearer(employee.token))
        .expect(403);
    });
  });

  describe('/especies', () => {
    it('empty list is 200 []', async () => {
      await t.http.get('/especies').set(bearer(employee.token)).expect(200, []);
    });

    it('employee creates (201) and anyone authenticated reads', async () => {
      const zone = await t.http
        .post('/areas')
        .set(bearer(admin))
        .send({ nombre: 'Sabana' })
        .expect(201);
      const created = await t.http
        .post('/especies')
        .set(bearer(employee.token))
        .send({ nombre: 'Felinos', id_area: zone.body.id })
        .expect(201);
      expect(created.body).toEqual({
        id: expect.any(String),
        nombre: 'Felinos',
        id_area: zone.body.id,
      });

      const visitor = await createUser(t, UserRole.USUARIO);
      await t.http
        .get('/especies')
        .set(bearer(visitor.token))
        .expect(200, [{ id: created.body.id, nombre: 'Felinos', animals: [] }]);
      await t.http
        .get(`/especies/${created.body.id}`)
        .set(bearer(visitor.token))
        .expect(200);
    });

    it('create: 404 unknown area, 409 taken name, 400 invalid body, 403 for ADMIN and USUARIO', async () => {
      const zone = await t.http
        .post('/areas')
        .set(bearer(admin))
        .send({ nombre: 'Sabana' })
        .expect(201);
      await t.http
        .post('/especies')
        .set(bearer(employee.token))
        .send({ nombre: 'Felinos', id_area: randomUUID() })
        .expect(404);
      await t.http
        .post('/especies')
        .set(bearer(employee.token))
        .send({ nombre: 'Felinos', id_area: zone.body.id })
        .expect(201);
      await t.http
        .post('/especies')
        .set(bearer(employee.token))
        .send({ nombre: 'Felinos', id_area: zone.body.id })
        .expect(409);
      await t.http
        .post('/especies')
        .set(bearer(employee.token))
        .send({ nombre: 'Aves', id_area: 'nope' })
        .expect(400);
      const visitor = await createUser(t, UserRole.USUARIO);
      await t.http
        .post('/especies')
        .set(bearer(admin))
        .send({ nombre: 'Aves', id_area: zone.body.id })
        .expect(403);
      await t.http
        .post('/especies')
        .set(bearer(visitor.token))
        .send({ nombre: 'Aves', id_area: zone.body.id })
        .expect(403);
    });

    it('update: keeping its own name is allowed (was 409), another species name is 409, 404s', async () => {
      const { zoneId, speciesId } = await createZooData(t, employee);
      await t.http
        .post('/especies')
        .set(bearer(employee.token))
        .send({ nombre: 'Aves', id_area: zoneId })
        .expect(201);
      const other = await t.http
        .post('/areas')
        .set(bearer(admin))
        .send({ nombre: 'Selva' })
        .expect(201);

      const moved = await t.http
        .put(`/especies/${speciesId}`)
        .set(bearer(employee.token))
        .send({ nombre: 'Felinos 1', id_area: other.body.id })
        .expect(200);
      expect(moved.body).toEqual({
        id: speciesId,
        nombre: 'Felinos 1',
        id_area: other.body.id,
      });
      await t.http
        .put(`/especies/${speciesId}`)
        .set(bearer(employee.token))
        .send({ nombre: 'Aves', id_area: zoneId })
        .expect(409);
      await t.http
        .put(`/especies/${speciesId}`)
        .set(bearer(employee.token))
        .send({ nombre: 'Peces', id_area: randomUUID() })
        .expect(404);
      await t.http
        .put(`/especies/${randomUUID()}`)
        .set(bearer(employee.token))
        .send({ nombre: 'Peces', id_area: zoneId })
        .expect(404);
    });

    it('delete: 409 with animals (was a 500), 204 when empty, 404 unknown', async () => {
      const { zoneId, speciesId } = await createZooData(t, employee);
      const empty = await t.http
        .post('/especies')
        .set(bearer(employee.token))
        .send({ nombre: 'Aves', id_area: zoneId })
        .expect(201);

      const conflict = await t.http
        .delete(`/especies/${speciesId}`)
        .set(bearer(employee.token))
        .expect(409);
      expect(conflict.body.message).toBe(
        'No se puede eliminar la especie, hay animales relacionados',
      );
      await t.http
        .delete(`/especies/${empty.body.id}`)
        .set(bearer(employee.token))
        .expect(204);
      await t.http
        .get(`/especies/${empty.body.id}`)
        .set(bearer(employee.token))
        .expect(404);
      await t.http
        .delete(`/especies/${empty.body.id}`)
        .set(bearer(employee.token))
        .expect(404);
    });
  });
});
