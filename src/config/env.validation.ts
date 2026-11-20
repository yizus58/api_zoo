/**
 * Validates the environment once at startup so a missing setting fails fast with a clear
 * message instead of a confusing error on the first request. Values are never logged.
 */
/** Environment values are strings; anything else is treated as empty. */
const text = (value: unknown): string =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean'
    ? String(value)
    : '';

const REQUIRED = ['DB_NAME', 'DB_USERNAME', 'DB_PASSWORD', 'JWT_KEY'] as const;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED.filter(
    (key) => typeof config[key] !== 'string' || !text(config[key]).trim(),
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')} (see .env.example)`,
    );
  }

  if (text(config.JWT_KEY).length < 32) {
    throw new Error('JWT_KEY must be at least 32 characters long');
  }

  for (const key of ['PORT', 'DB_PORT']) {
    const value = config[key];
    if (value !== undefined && value !== '' && !/^\d+$/.test(text(value))) {
      throw new Error(`${key} must be a number`);
    }
  }

  return config;
}

export function flag(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return ['true', '1', 'yes'].includes(text(value).trim().toLowerCase());
}
