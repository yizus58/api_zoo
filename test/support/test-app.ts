import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Sequelize } from 'sequelize-typescript';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { UserRole } from '../../src/common/types/user-role';
import { RabbitMQService } from '../../src/integrations/messaging/rabbitmq.service';
import { S3Service } from '../../src/integrations/storage/s3.service';
import {
  AdminSeeder,
  ADMIN_EMAIL,
} from '../../src/modules/users/admin-seeder.service';
import { hasTestDatabase } from './env';

export { hasTestDatabase };
export const describeWithDb = hasTestDatabase ? describe : describe.skip;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
export const PASSWORD = 'secret-password-1';

export interface Fakes {
  storage: { upload: jest.Mock; delete: jest.Mock };
  messaging: { publish: jest.Mock };
}

export interface TestApp {
  app: INestApplication;
  http: ReturnType<typeof request>;
  sequelize: Sequelize;
  fakes: Fakes;
  close(): Promise<void>;
}

/** The real application (real DB, guards, pipes, filter) with storage and RabbitMQ faked. */
export async function createTestApp(): Promise<TestApp> {
  const fakes: Fakes = {
    storage: {
      upload: jest.fn(async () => `key-${Math.random().toString(16).slice(2)}`),
      delete: jest.fn(async () => undefined),
    },
    messaging: { publish: jest.fn(async () => undefined) },
  };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(S3Service)
    .useValue(fakes.storage)
    .overrideProvider(RabbitMQService)
    .useValue(fakes.messaging)
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return {
    app,
    http: request(app.getHttpServer()),
    sequelize: app.get(Sequelize),
    fakes,
    close: () => app.close(),
  };
}

/** Empties every table and re-creates the seeded admin. */
export async function resetDatabase(t: TestApp): Promise<void> {
  await t.sequelize.query(
    'TRUNCATE comments, animals, species, areas, users CASCADE',
  );
  await t.app.get(AdminSeeder).seed();
  jest.clearAllMocks();
}

export async function login(
  t: TestApp,
  email: string,
  password: string,
): Promise<string> {
  const response = await request(t.app.getHttpServer())
    .post('/auth')
    .send({ email, password })
    .expect(200);
  return response.body.token;
}

export function adminToken(t: TestApp): Promise<string> {
  return login(t, ADMIN_EMAIL, ADMIN_PASSWORD);
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

/** Creates a user through the API (as admin) and logs in as that user. */
export async function createUser(
  t: TestApp,
  role: UserRole,
  email?: string,
): Promise<TestUser> {
  const address =
    email ??
    `${role.toLowerCase()}-${Math.random().toString(16).slice(2, 8)}@mail.com`;
  const response = await request(t.app.getHttpServer())
    .post('/users')
    .set('Authorization', `Bearer ${await adminToken(t)}`)
    .send({ email: address, password: PASSWORD, role })
    .expect(201);
  return {
    id: response.body.id,
    email: address,
    token: await login(t, address, PASSWORD),
  };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Seeds an area, a species and (optionally) an animal through the API. */
export async function createZooData(
  t: TestApp,
  employee: TestUser,
  suffix = '1',
) {
  const server = t.app.getHttpServer();
  const admin = await adminToken(t);
  const zone = await request(server)
    .post('/areas')
    .set(bearer(admin))
    .send({ nombre: `Zona ${suffix}` })
    .expect(201);
  const species = await request(server)
    .post('/especies')
    .set(bearer(employee.token))
    .send({ nombre: `Felinos ${suffix}`, id_area: zone.body.id })
    .expect(201);
  const animal = await request(server)
    .post('/animales')
    .set(bearer(employee.token))
    .send({ nombre: `Leon ${suffix}`, id_especie: species.body.id })
    .expect(201);
  return {
    zoneId: zone.body.id as string,
    speciesId: species.body.id as string,
    animalId: animal.body.id as string,
  };
}
