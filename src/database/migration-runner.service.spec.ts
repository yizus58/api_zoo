import { ConfigService } from '@nestjs/config';
import { MigrationRunner } from './migration-runner.service';
import * as migrator from './migrator';
import { MIGRATIONS } from './migrations';

describe('MigrationRunner', () => {
  const up = jest.fn(async () => [{ name: 'm1' }]);
  beforeEach(() => {
    up.mockClear();
    jest.spyOn(migrator, 'createMigrator').mockReturnValue({ up } as never);
  });

  it('applies pending migrations on start by default', async () => {
    await new MigrationRunner(
      {} as never,
      new ConfigService({}),
    ).onModuleInit();
    expect(up).toHaveBeenCalled();
  });

  it('DB_MIGRATE=false skips them', async () => {
    await new MigrationRunner(
      {} as never,
      new ConfigService({ DB_MIGRATE: 'false' }),
    ).onModuleInit();
    expect(up).not.toHaveBeenCalled();
  });
});

describe('migration list', () => {
  it('is ordered by name and every migration can be reverted', () => {
    const names = MIGRATIONS.map((m) => m.name);
    expect(names).toEqual([...names].sort());
    expect(new Set(names).size).toBe(names.length);
    MIGRATIONS.forEach((m) => {
      expect(typeof m.up).toBe('function');
      expect(typeof m.down).toBe('function');
    });
  });
});
