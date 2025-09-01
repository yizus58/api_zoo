import * as cron from 'node-cron';
import { CronService } from '../services/cron.service';

export function initCronJobs(cronService: CronService) {
  const cronTimeDelay = '* 1 * * * *';
  const timezone = 'America/Bogota';

  console.log(
    `🕐 Cron job diario inicializado con la expresión: ${cronTimeDelay}`,
  );
  console.log(`🌍 Timezone configurado: ${timezone}`);

  cron.schedule(
    cronTimeDelay,
    async () => {
      const timestamp = new Date().toLocaleString('es-CO');
      console.log(
        `⏰ [${timestamp}] [CRON AUTOMÁTICO] Ejecutando tarea programada...`,
      );

      try {
        await cronService.executeDailyTask();
        console.log(`✅ [${timestamp}] Tarea diaria completada exitosamente`);
      } catch (error) {
        console.error(
          `❌ [${timestamp}] Error en tarea programada:`,
          error.message,
        );
        console.log(`⚠️ [${timestamp}] No se pudo ejecutar la tarea diaria`);
      }
    },
    {
      timezone: timezone,
    },
  );

  console.log('🚀 Cron jobs inicializados correctamente');
}
