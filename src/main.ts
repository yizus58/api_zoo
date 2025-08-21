import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DatabaseInitService } from './services/database-init.service';

async function bootstrap() {
  const startTime = Date.now();

  try {
    const configService = new ConfigService();
    const databaseInitService = new DatabaseInitService(configService);
    await databaseInitService.initializeDatabase();

    if (configService.get<string>('NODE_ENV') === 'development') {
      await databaseInitService.syncModels();
    }
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error.message);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['log', 'error', 'warn', 'debug', 'verbose'],
    bufferLogs: true,
  });

  app.enableCors({
    origin: process.env.NODE_ENV === 'development' ? '*' : false,
  });

  app.getHttpAdapter().getInstance().disable('x-powered-by');

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  const endTime = Date.now();
  const startupTime = endTime - startTime;

  console.log(`🚀 Servidor iniciado en http://localhost:${port}`);
  console.log(`⚡ Tiempo de inicio: ${startupTime}ms`);
}

bootstrap().catch((error) => {
  console.error('❌ Error al iniciar la aplicación:', error);
  process.exit(1);
});
