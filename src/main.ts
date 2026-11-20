import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';
import { flag } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  configureApp(app);

  const config = app.get(ConfigService);
  const corsOrigins = config.get<string>('CORS_ORIGINS');
  app.enableCors({
    origin: corsOrigins
      ? corsOrigins.split(',').map((origin) => origin.trim())
      : config.get('NODE_ENV') === 'development',
  });
  if (
    flag(config.get('SWAGGER_ENABLED'), config.get('NODE_ENV') !== 'production')
  ) {
    setupSwagger(app);
  }

  const port = Number(config.get('PORT', 3000));
  await app.listen(port, '0.0.0.0');
  logger.log(`API Zoo escuchando en el puerto ${port}`);
}

bootstrap().catch((error) => {
  new Logger('Bootstrap').error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
