import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { initCronJobs } from './config/cron';
import { CronService } from './services/cron.service';
import { DatabaseInitService } from './services/database-init.service';
import { SeederService } from './services/seeder.service';

async function bootstrap() {
  const startTime = Date.now();

  try {
    const configService = new ConfigService();
    const databaseInitService = new DatabaseInitService(configService);
    await databaseInitService.initializeDatabase();

    const nodeEnv = configService.get<string>('NODE_ENV');
    console.log(`🏁 Iniciando el entorno de ejecución: ${nodeEnv}`);

    if (
      nodeEnv === 'development' ||
      nodeEnv === 'test' ||
      nodeEnv === 'local'
    ) {
      await databaseInitService.syncModels();

      const seederService = new SeederService(configService, databaseInitService);
      const shouldRun = await seederService.shouldRunSeeder();

      if (shouldRun) {
        await seederService.runSeeder();
      } else {
        console.log('🌱 Seeder ya ejecutado anteriormente, omitiendo...');
      }
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

  const config = new DocumentBuilder()
    .setTitle('Mails API')
    .setDescription('The Mails API endpoints')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  const endTime = Date.now();
  const startupTime = endTime - startTime;

  console.log(`🚀 Servidor iniciado en http://localhost:${port}`);
  console.log(`⚡ Tiempo de inicio: ${startupTime}ms`);

  try {
    const cronService = app.get(CronService);
    initCronJobs(cronService);
    console.log(
      '⏰ Cron jobs inicializados correctamente - ejecutándose automáticamente',
    );
  } catch (error) {
    console.error('❌ Error al inicializar el Cron Jobs:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Error al iniciar la aplicación:', error);
  process.exit(1);
});
