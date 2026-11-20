import { UserRole } from '../src/common/types/user-role';
import {
  bearer,
  createTestApp,
  createUser,
  describeWithDb,
  resetDatabase,
  TestApp,
} from './support/test-app';
import { setupSwagger } from '../src/app.setup';
import { seedDemoData } from '../src/database/seeds/demo-data.seeder';

describeWithDb('Application wiring (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => resetDatabase(t));
  afterAll(() => t.close());

  it('unknown routes return the JSON error shape (after authentication)', async () => {
    const user = await createUser(t, UserRole.USUARIO);
    const response = await t.http
      .get('/no-existe')
      .set(bearer(user.token))
      .expect(404);
    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 404,
        path: '/no-existe',
        timestamp: expect.any(String),
      }),
    );
  });

  it('does not advertise Express', async () => {
    const response = await t.http.post('/auth').send({});
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('ValidationPipe: unknown fields are stripped, invalid bodies get 400 with the messages', async () => {
    const user = await createUser(t, UserRole.EMPLEADO);
    const zone = await t.http
      .post('/areas')
      .set(
        bearer(
          (
            await t.http.post('/auth').send({
              email: 'admin@mail.com',
              password: process.env.ADMIN_PASSWORD,
            })
          ).body.token,
        ),
      )
      .send({
        nombre: 'Zona',
        id: '00000000-0000-0000-0000-000000000000',
        extra: true,
      })
      .expect(201);
    expect(zone.body.id).not.toBe('00000000-0000-0000-0000-000000000000');
    expect(zone.body.extra).toBeUndefined();

    const bad = await t.http
      .post('/especies')
      .set(bearer(user.token))
      .send({ nombre: '' })
      .expect(400);
    expect(Array.isArray(bad.body.message)).toBe(true);
  });

  describe('demo data seeder (npm run db:seed)', () => {
    const options = {
      employees: 2,
      zones: 2,
      speciesPerZone: 2,
      animalsPerSpecies: 2,
      commentsPerAnimal: 2,
      employeePassword: 'demo-password',
      reset: false,
    };
    const count = async (table: string) =>
      Number(
        (
          (
            await t.sequelize.query(`SELECT count(*) AS n FROM ${table}`)
          )[0][0] as { n: string }
        ).n,
      );

    it('fills an empty database', async () => {
      const result = await seedDemoData(t.sequelize, options);
      expect(result).toEqual(
        expect.objectContaining({
          skipped: false,
          employees: 2,
          zones: 2,
          species: 4,
          animals: 8,
          comments: 16,
        }),
      );
      expect(await count('comments')).toBe(16 + result.replies);
    });

    it('never touches a database that has data (it used to wipe it on every start)', async () => {
      await seedDemoData(t.sequelize, options);
      const before = await count('animals');
      await expect(seedDemoData(t.sequelize, options)).resolves.toEqual(
        expect.objectContaining({ skipped: true }),
      );
      expect(await count('animals')).toBe(before);
    });

    it('--reset replaces the demo data and keeps the admin', async () => {
      await seedDemoData(t.sequelize, options);
      await seedDemoData(t.sequelize, { ...options, reset: true, zones: 1 });
      expect(await count('areas')).toBe(1);
      const admins = await t.sequelize.query(
        `SELECT email FROM users WHERE role = 'ADMIN'`,
      );
      expect(admins[0]).toEqual([{ email: 'admin@mail.com' }]);
      expect(await count("users WHERE role = 'EMPLEADO'")).toBe(2);
    });
  });
});

describe('Swagger document', () => {
  it('is titled "API Zoo" (it said "Mails API") and declares bearer auth', async () => {
    const { NestFactory } = await import('@nestjs/core');
    const { Module } = await import('@nestjs/common');
    @Module({})
    class EmptyModule {}
    const app = await NestFactory.create(EmptyModule, { logger: false });
    const document = setupSwagger(app);
    expect(document.info.title).toBe('API Zoo');
    expect(document.components?.securitySchemes?.bearer).toEqual(
      expect.objectContaining({ type: 'http', scheme: 'bearer' }),
    );
    await app.close();
  });
});
