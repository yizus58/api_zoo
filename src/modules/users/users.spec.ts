import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/types/user-role';
import { modelMock, ModelMock } from '../../testing/model-mock';
import { AdminSeeder, ADMIN_EMAIL } from './admin-seeder.service';
import { UsersService } from './users.service';

const row = {
  id: 'u1',
  email: 'a@mail.com',
  role: UserRole.EMPLEADO,
  password: 'hash',
};

describe('UsersService', () => {
  let users: ModelMock;
  let service: UsersService;

  beforeEach(() => {
    users = modelMock();
    service = new UsersService(users as never);
  });

  it('create hashes the password and never returns it', async () => {
    users.findOne.mockResolvedValue(null);
    users.create.mockImplementation(async (values) => ({
      id: 'u1',
      ...values,
    }));

    const created = await service.create({
      email: 'a@mail.com',
      password: 'secret-pass',
      role: UserRole.EMPLEADO,
    });

    expect(created).toEqual({
      id: 'u1',
      email: 'a@mail.com',
      role: UserRole.EMPLEADO,
    });
    const stored = users.create.mock.calls[0][0];
    expect(stored.password).not.toBe('secret-pass');
    await expect(bcrypt.compare('secret-pass', stored.password)).resolves.toBe(
      true,
    );
  });

  it('create: 409 when the email exists (case-insensitive lookup)', async () => {
    users.findOne.mockResolvedValue(row);
    await expect(
      service.create({
        email: 'A@mail.com',
        password: 'secret-pass',
        role: UserRole.USUARIO,
      }),
    ).rejects.toThrow(new ConflictException('El email ya está registrado'));
    expect(users.create).not.toHaveBeenCalled();
  });

  it('findAll maps rows to responses, ordered by email', async () => {
    users.findAll.mockResolvedValue([row]);
    await expect(service.findAll()).resolves.toEqual([
      { id: 'u1', email: 'a@mail.com', role: UserRole.EMPLEADO },
    ]);
    expect(users.findAll).toHaveBeenCalledWith({ order: [['email', 'ASC']] });
  });

  it('findById: the user, or 404', async () => {
    users.findByPk.mockResolvedValueOnce(row).mockResolvedValueOnce(null);
    await expect(service.findById('u1')).resolves.toEqual({
      id: 'u1',
      email: 'a@mail.com',
      role: UserRole.EMPLEADO,
    });
    await expect(service.findById('x')).rejects.toThrow(NotFoundException);
  });

  it('findAuthenticated returns null instead of throwing', async () => {
    users.findByPk.mockResolvedValue(null);
    await expect(service.findAuthenticated('gone')).resolves.toBeNull();
  });

  it('findByEmailWithPassword uses the withPassword scope', async () => {
    users.findOne.mockResolvedValue(row);
    await expect(service.findByEmailWithPassword(' A@Mail.com ')).resolves.toBe(
      row,
    );
    expect(users.scope).toHaveBeenCalledWith('withPassword');
  });
});

describe('AdminSeeder', () => {
  const build = (values: Record<string, string>) => {
    const users = modelMock();
    return {
      users,
      seeder: new AdminSeeder(users as never, new ConfigService(values)),
    };
  };

  it('creates admin@mail.com as ADMIN with the hashed ADMIN_PASSWORD', async () => {
    const { users, seeder } = build({ ADMIN_PASSWORD: 'admin-password' });
    users.findOne.mockResolvedValue(null);
    await expect(seeder.seed()).resolves.toBe(true);
    const created = users.create.mock.calls[0][0];
    expect(created).toEqual(
      expect.objectContaining({ email: ADMIN_EMAIL, role: UserRole.ADMIN }),
    );
    await expect(
      bcrypt.compare('admin-password', created.password),
    ).resolves.toBe(true);
  });

  it('never touches an existing admin', async () => {
    const { users, seeder } = build({ ADMIN_PASSWORD: 'admin-password' });
    users.findOne.mockResolvedValue(row);
    await expect(seeder.seed()).resolves.toBe(false);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('refuses to seed without ADMIN_PASSWORD (there is no default password any more)', async () => {
    const { seeder } = build({});
    await expect(seeder.seed()).rejects.toThrow(/ADMIN_PASSWORD must be set/);
  });

  it.each([
    [{ NODE_ENV: 'development' }, true],
    [{ NODE_ENV: 'production' }, false],
    [{ NODE_ENV: 'production', SEED_ADMIN: 'true' }, true],
    [{ NODE_ENV: 'development', SEED_ADMIN: 'false' }, false],
  ])('on bootstrap with %p seeds: %p', async (env, seeds) => {
    const { seeder } = build({ ...env, ADMIN_PASSWORD: 'x' });
    const seed = jest.spyOn(seeder, 'seed').mockResolvedValue(true);
    await seeder.onApplicationBootstrap();
    expect(seed).toHaveBeenCalledTimes(seeds ? 1 : 0);
  });
});
