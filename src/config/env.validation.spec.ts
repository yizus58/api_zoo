import { flag, validateEnv } from './env.validation';

const valid = {
  DB_NAME: 'zoo',
  DB_USERNAME: 'user',
  DB_PASSWORD: 'pw',
  JWT_KEY: 'k'.repeat(32),
};

describe('validateEnv', () => {
  it('accepts a complete configuration and returns it', () => {
    expect(validateEnv({ ...valid, PORT: '3000', DB_PORT: '5432' })).toEqual(
      expect.objectContaining(valid),
    );
  });

  it('lists every missing or blank variable without printing values', () => {
    expect(() => validateEnv({ DB_NAME: 'zoo', DB_PASSWORD: '  ' })).toThrow(
      'Missing required environment variables: DB_USERNAME, DB_PASSWORD, JWT_KEY (see .env.example)',
    );
  });

  it('requires a JWT key of at least 32 characters', () => {
    expect(() => validateEnv({ ...valid, JWT_KEY: 'short' })).toThrow(
      'JWT_KEY must be at least 32 characters long',
    );
  });

  it.each(['PORT', 'DB_PORT'])('%s must be numeric when set', (key) => {
    expect(() => validateEnv({ ...valid, [key]: 'abc' })).toThrow(
      `${key} must be a number`,
    );
    expect(() => validateEnv({ ...valid, [key]: '' })).not.toThrow();
  });
});

describe('flag', () => {
  it.each([
    [undefined, true, true],
    ['', false, false],
    ['true', false, true],
    ['1', false, true],
    [' YES ', false, true],
    ['false', true, false],
    ['0', true, false],
    [true, false, true],
  ])('flag(%p, default %p) is %p', (value, defaultValue, expected) => {
    expect(flag(value, defaultValue)).toBe(expected);
  });
});
