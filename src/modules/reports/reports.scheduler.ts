import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cron from 'node-cron';
import { flag } from '../../config/env.validation';
import { DEFAULT_TIMEZONE } from '../indicators/indicators.service';
import { DailyReportService } from './daily-report.service';

/** Every day at 23:55 (APP_TIMEZONE), so the whole day's comments are included. */
export const DEFAULT_REPORT_CRON = '0 55 23 * * *';

/**
 * Schedules the daily report (REPORTS_ENABLED=false to turn it off; off by default in tests).
 * A run that is still going when the next one is due is not started twice.
 */
@Injectable()
export class ReportsScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ReportsScheduler.name);
  private task: cron.ScheduledTask | null = null;
  private running = false;

  constructor(
    private readonly reports: DailyReportService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const enabled = flag(
      this.config.get('REPORTS_ENABLED'),
      this.config.get('NODE_ENV') !== 'test',
    );
    if (!enabled) {
      this.logger.log('Reporte diario deshabilitado (REPORTS_ENABLED=false)');
      return;
    }

    const expression = this.config.get<string>(
      'REPORTS_CRON',
      DEFAULT_REPORT_CRON,
    );
    if (!cron.validate(expression)) {
      throw new Error(
        `REPORTS_CRON no es una expresión cron válida: ${expression}`,
      );
    }
    const timezone = this.config.get<string>('APP_TIMEZONE', DEFAULT_TIMEZONE);
    this.task = cron.schedule(expression, () => void this.runOnce(), {
      timezone,
    });
    this.logger.log(`Reporte diario programado: "${expression}" (${timezone})`);
  }

  async runOnce(): Promise<void> {
    if (this.running) {
      this.logger.warn(
        'El reporte anterior sigue en curso; se omite esta ejecución',
      );
      return;
    }
    this.running = true;
    try {
      await this.reports.run();
    } catch (error) {
      this.logger.error(
        `Error en el reporte diario: ${(error as Error).message}`,
      );
    } finally {
      this.running = false;
    }
  }

  onApplicationShutdown(): void {
    void this.task?.stop();
    this.task = null;
  }
}
