# API Zoo

REST API for a zoo: zones (areas), species, animals, visitor comments with one level of
replies, indicators, and a daily report. Each employee gets an Excel file and a PDF covering
the comments made that day on the animals they are responsible for. The files are uploaded to
Cloudflare R2 and the e-mail is sent through **api-mail** over RabbitMQ.

NestJS 11 · Sequelize (sequelize-typescript) · PostgreSQL · Umzug migrations · Jest + Supertest.

## Structure

```
src/
  main.ts, app.module.ts, app.setup.ts   bootstrap, global pipe/filter, Swagger
  config/        environment validation, database settings
  common/        guards (JWT, roles), decorators, exception filter, utils, types
  database/      DatabaseModule, migrations (Umzug), migration runner, CLI, demo seeder
  integrations/  storage (R2/S3), messaging (RabbitMQ → api-mail)
  modules/       one feature module per resource
    auth/ users/ zones/ species/ animals/ comments/ indicators/ reports/
      *.controller.ts  HTTP only (routes, DTOs, status codes, Swagger)
      *.service.ts     business rules
      *.model.ts       Sequelize model
      dto/             validated request/response shapes
test/            e2e suites against a real PostgreSQL database
```

## Getting started

```bash
cp .env.example .env    # fill in DB_*, JWT_KEY (32+ chars) and ADMIN_PASSWORD
npm ci
npm run start:dev       # creates the database if missing, applies migrations, seeds the admin
```

Swagger UI is served at `http://localhost:3000/api` (`SWAGGER_ENABLED`, off in production by default).
Log in with `POST /auth` and send the token as `Authorization: Bearer <token>`.

The admin user `admin@mail.com` is created with `ADMIN_PASSWORD` when `SEED_ADMIN=true`.
That is the default in development. An existing admin is never modified.

## Database

The migrations own the schema; Sequelize never runs `sync`.

| Command | |
|---|---|
| `npm run db:migrate` | apply pending migrations (also done on start unless `DB_MIGRATE=false`) |
| `npm run db:migrate:down` | revert the last migration |
| `npm run db:status` | applied / pending migrations |
| `npm run db:seed [-- --reset]` | random demo data (`DEMO_USER_PASSWORD` required); never touches a non-empty DB without `--reset` |
| `npm run db:migrate:prod` | `node dist/database/cli.js migrate` after `npm run build` |

Databases created by the old `sync({ alter: true })` are adopted as they are. The baseline
migration uses `IF NOT EXISTS`. The second migration removes the duplicated `*_key1`, `*_key2`…
unique constraints and replaces the cascading foreign keys. Deleting an area or a species can no
longer silently delete animals, and replies are deleted together with their main comment.

## API

Every route requires a Bearer token except `POST /auth`.

| Method & path | Roles | Notes |
|---|---|---|
| `POST /auth` | public | 200 `{ token, user }`; same 401 for unknown e-mail and wrong password |
| `POST /users` | ADMIN | 201; 409 duplicate e-mail (case-insensitive); password 8–72 chars |
| `GET /users` | ADMIN | |
| `GET /users/profile` | any | the current user (never the password hash) |
| `GET /areas`, `GET /areas/:id` | any | with species and their animals |
| `POST /areas`, `PUT /areas/:id` | ADMIN | 409 duplicate name |
| `DELETE /areas/:id` | ADMIN | 204; 409 while it has species |
| `GET /especies`, `GET /especies/:id` | any | |
| `POST /especies`, `PUT /especies/:id` | EMPLEADO | 404 unknown area; 409 duplicate name |
| `DELETE /especies/:id` | EMPLEADO | 204; 409 while it has animals |
| `GET /animales`, `GET /animales/:id` | any | |
| `POST /animales` | EMPLEADO | the creator becomes responsible for the animal |
| `PUT /animales/:id`, `DELETE /animales/:id` | EMPLEADO | only the responsible employee (403); delete removes its comments |
| `GET /comentarios` | any | all comments with author, animal, parent and replies |
| `GET /comentarios/:animalId` | any | main comments of the animal with replies; 404 unknown animal |
| `POST /comentarios` | any | reply: `id_comentario_principal` must be a main comment of the same animal |
| `PUT /comentarios/:id` | author | only the text can change |
| `DELETE /comentarios/:id` | author, ADMIN, EMPLEADO | 204; replies are deleted too |
| `GET /indicadores/total-animales[/:id]` | any | animals per zone |
| `GET /indicadores/total-animales-especies[/:id]` | any | animals per species |
| `GET /indicadores/porcentaje-comentarios-animales` | any | comment share per animal |
| `GET /indicadores/porcentaje-comentario-respuesta` | any | reply rate |
| `GET /indicadores/query?search=` | any | search in every entity (literal match, `%`/`_` escaped); 400 without `search` |
| `GET /indicadores/reporte-animales` | any | animals registered today (`APP_TIMEZONE`) |

Status codes: create 201 · update 200 · delete 204 · validation 400 · no/invalid token 401 ·
wrong role/owner 403 · missing resource 404 · conflict 409. Empty lists are `200 []`. Errors share one
JSON shape: `{ statusCode, error, message, path, timestamp }`. Unknown body fields are stripped.

## Daily report

`REPORTS_CRON` (default `0 55 23 * * *`) in `APP_TIMEZONE` (default `America/Bogota`). Overlapping
runs are skipped. A failure for one employee does not stop the others, and the files already
uploaded for that employee are deleted. The message published to `QUEUE_NAME` uses the
api-mail contract (`type: email_notification`, attachments `{ name_file, s3_name }`).
R2 settings are only needed when the report runs.

## Tests

```bash
npm test               # unit tests (no external services)
npm run test:cov
TEST_DB_NAME=zoo_test npm run test:e2e   # e2e against PostgreSQL (TEST_DB_HOST/PORT/USERNAME/PASSWORD)
```

The e2e suites boot the real application (guards, pipes, filter, migrations) on `TEST_DB_NAME`.
**They empty that database.** R2 and RabbitMQ are replaced with fakes. Without `TEST_DB_NAME`
the database suites are skipped.
