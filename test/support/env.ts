/**
 * Loaded before every e2e file (jest setupFiles). The e2e tests need a throwaway PostgreSQL
 * database: TEST_DB_NAME (+ TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USERNAME, TEST_DB_PASSWORD).
 * The tests delete every row in it. Without TEST_DB_NAME the database suites are skipped.
 */
export const hasTestDatabase = Boolean(process.env.TEST_DB_NAME);

process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.TEST_DB_HOST ?? 'localhost';
process.env.DB_PORT = process.env.TEST_DB_PORT ?? '5432';
process.env.DB_USERNAME = process.env.TEST_DB_USERNAME ?? 'postgres';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD ?? 'postgres';
process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'zoo_e2e_not_configured';
process.env.JWT_KEY = 'e2e-only-signing-key-0123456789-abcdefghijklmnop';
process.env.ADMIN_PASSWORD = 'e2e-admin-password';
process.env.SEED_ADMIN = 'true';
process.env.REPORTS_ENABLED = 'false';
process.env.DB_MIGRATE = 'true';
process.env.DB_CREATE_IF_MISSING = 'true';
