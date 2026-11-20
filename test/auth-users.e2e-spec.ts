import * as jwt from 'jsonwebtoken';
import { UserRole } from '../src/common/types/user-role';
import { ADMIN_EMAIL } from '../src/modules/users/admin-seeder.service';
import {
  ADMIN_PASSWORD,
  adminToken,
  bearer,
  createTestApp,
  createUser,
  describeWithDb,
  PASSWORD,
  resetDatabase,
  TestApp,
} from './support/test-app';

describeWithDb('Auth and users (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => resetDatabase(t));
  afterAll(() => t.close());

  describe('POST /auth', () => {
    it('logs in with 200, a token and the user without the password hash', async () => {
      const response = await t.http
        .post('/auth')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);

      expect(response.body.token).toEqual(expect.any(String));
      expect(response.body.user).toEqual({
        id: expect.any(String),
        email: ADMIN_EMAIL,
        role: UserRole.ADMIN,
      });
      expect(JSON.stringify(response.body)).not.toContain('password');
    });

    it('accepts the email in any case', async () => {
      await t.http
        .post('/auth')
        .send({ email: 'ADMIN@Mail.com', password: ADMIN_PASSWORD })
        .expect(200);
    });

    it('answers unknown email and wrong password with the same 401', async () => {
      const wrongPassword = await t.http
        .post('/auth')
        .send({ email: ADMIN_EMAIL, password: 'nope-nope' })
        .expect(401);
      const unknownEmail = await t.http
        .post('/auth')
        .send({ email: 'ghost@mail.com', password: 'nope-nope' })
        .expect(401);

      expect(wrongPassword.body.message).toBe('Credenciales inválidas');
      expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
    });

    it('validates the body (400 with every message)', async () => {
      const response = await t.http
        .post('/auth')
        .send({ email: 'not-an-email' })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'Debe proporcionar un email válido',
          'La contraseña es requerida',
        ]),
      );
    });
  });

  describe('authentication guard', () => {
    it('401 without a token, with garbage, with a foreign signature, expired, or alg none', async () => {
      const admin = await t.http
        .post('/auth')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      const uid = admin.body.user.id;
      const foreign = jwt.sign(
        { uid },
        'another-key-another-key-another-key-123',
      );
      const expired = jwt.sign(
        { uid, exp: Math.floor(Date.now() / 1000) - 60 },
        process.env.JWT_KEY,
      );
      const none = jwt.sign({ uid }, '', { algorithm: 'none' });

      await t.http.get('/users/profile').expect(401);
      for (const token of ['garbage', foreign, expired, none]) {
        const response = await t.http
          .get('/users/profile')
          .set(bearer(token))
          .expect(401);
        expect(response.body.message).toBe('Token inválido');
      }
    });

    it('401 (not 404) for the token of a user that no longer exists', async () => {
      const employee = await createUser(t, UserRole.EMPLEADO);
      await t.sequelize.query('DELETE FROM users WHERE id = :id', {
        replacements: { id: employee.id },
      });

      const response = await t.http
        .get('/users/profile')
        .set(bearer(employee.token))
        .expect(401);
      expect(response.body.message).toBe('Usuario no encontrado');
    });

    it('takes the role from the database, not from the token', async () => {
      const employee = await createUser(t, UserRole.EMPLEADO);
      await t.sequelize.query(
        `UPDATE users SET role = 'ADMIN' WHERE id = :id`,
        { replacements: { id: employee.id } },
      );

      await t.http.get('/users').set(bearer(employee.token)).expect(200);
    });
  });

  describe('POST /users', () => {
    it('admin creates a user: 201 without the password, and the user can log in', async () => {
      const response = await t.http
        .post('/users')
        .set(bearer(await adminToken(t)))
        .send({
          email: '  New.Keeper@Mail.com ',
          password: PASSWORD,
          role: UserRole.EMPLEADO,
        })
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        email: 'new.keeper@mail.com',
        role: UserRole.EMPLEADO,
      });
      await t.http
        .post('/auth')
        .send({ email: 'new.keeper@mail.com', password: PASSWORD })
        .expect(200);
    });

    it('409 for an email already registered, in any case', async () => {
      const admin = await adminToken(t);
      await t.http
        .post('/users')
        .set(bearer(admin))
        .send({
          email: 'dup@mail.com',
          password: PASSWORD,
          role: UserRole.USUARIO,
        })
        .expect(201);

      const response = await t.http
        .post('/users')
        .set(bearer(admin))
        .send({
          email: 'DUP@mail.com',
          password: PASSWORD,
          role: UserRole.USUARIO,
        })
        .expect(409);
      expect(response.body.message).toBe('El email ya está registrado');
    });

    it('400 for a short password, an invalid role or an invalid email', async () => {
      const response = await t.http
        .post('/users')
        .set(bearer(await adminToken(t)))
        .send({ email: 'x', password: '123', role: 'SUPERUSER' })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'Debe proporcionar un email válido',
          'La contraseña debe tener al menos 8 caracteres',
          'El rol debe ser ADMIN, EMPLEADO o USUARIO',
        ]),
      );
    });

    it('403 for EMPLEADO and USUARIO', async () => {
      for (const role of [UserRole.EMPLEADO, UserRole.USUARIO]) {
        const user = await createUser(t, role);
        await t.http
          .post('/users')
          .set(bearer(user.token))
          .send({
            email: 'other@mail.com',
            password: PASSWORD,
            role: UserRole.ADMIN,
          })
          .expect(403);
      }
    });
  });

  describe('GET /users', () => {
    it('admin lists users without password hashes', async () => {
      await createUser(t, UserRole.EMPLEADO, 'keeper@mail.com');

      const response = await t.http
        .get('/users')
        .set(bearer(await adminToken(t)))
        .expect(200);

      expect(response.body.map((u: { email: string }) => u.email)).toEqual([
        ADMIN_EMAIL,
        'keeper@mail.com',
      ]);
      expect(JSON.stringify(response.body)).not.toContain('password');
    });

    it('403 for non admins', async () => {
      const user = await createUser(t, UserRole.USUARIO);
      await t.http.get('/users').set(bearer(user.token)).expect(403);
    });
  });

  describe('GET /users/profile', () => {
    it('returns the caller for every role, never the password hash', async () => {
      for (const role of [UserRole.EMPLEADO, UserRole.USUARIO]) {
        const user = await createUser(t, role);
        const response = await t.http
          .get('/users/profile')
          .set(bearer(user.token))
          .expect(200);
        expect(response.body).toEqual({ id: user.id, email: user.email, role });
      }
      const admin = await t.http
        .get('/users/profile')
        .set(bearer(await adminToken(t)))
        .expect(200);
      expect(admin.body.role).toBe(UserRole.ADMIN);
      expect(admin.body.password).toBeUndefined();
    });
  });
});
