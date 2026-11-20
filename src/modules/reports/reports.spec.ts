import { ConfigService } from '@nestjs/config';
import * as ExcelJS from 'exceljs';
import * as cron from 'node-cron';
import { join } from 'path';
import { ExcelReportService, sheetName } from './excel-report.service';
import { PdfReportService } from './pdf-report.service';
import { DEFAULT_REPORT_CRON, ReportsScheduler } from './reports.scheduler';
import { UserReport } from './report.types';
import { dailyReportEmailHtml } from './report-email.template';

jest.mock('node-cron', () => ({
  ...jest.requireActual('node-cron'),
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

const report: UserReport = {
  user: 'u1',
  email: 'keeper@mail.com',
  data: [
    {
      zona: 'Sabana',
      specie: 'Felinos',
      animal: 'Leon',
      comentario: {
        id: 'c1',
        comentario: 'Muy activo hoy',
        autor: 'visitor@mail.com',
        fecha: new Date('2026-03-10T15:00:00Z'),
        respuesta: {
          id: 'r1',
          comentario: 'Gracias',
          autor: 'keeper@mail.com',
          fecha: new Date('2026-03-10T16:00:00Z'),
        },
      },
    },
  ],
};

describe('ExcelReportService', () => {
  const load = async (buffer: Buffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    return workbook.worksheets[0];
  };

  it('one row per commented animal, with the reply', async () => {
    const sheet = await load(await new ExcelReportService().build(report));
    expect(sheet.name).toBe('keeper@mail.com');
    expect(sheet.getCell('A1').value).toBe(
      'Usuario: keeper@mail.com | Reporte Animales Comentados',
    );
    expect(sheet.getRow(3).values).toEqual(
      expect.arrayContaining(['Zona', 'Respuesta', 'Autor Respuesta']),
    );
    expect(sheet.getCell('C4').value).toBe('Leon');
    expect(sheet.getCell('G4').value).toBe('Gracias');
  });

  it('an empty report says so instead of being blank', async () => {
    const sheet = await load(
      await new ExcelReportService().build({ ...report, data: [] }),
    );
    expect(sheet.getCell('A4').value).toBe('Sin comentarios registrados');
  });

  it('sheet names: no forbidden characters, at most 31 chars', () => {
    expect(sheetName('a/b:c*d?[e]@mail.com')).toBe('a_b_c_d__e_@mail.com');
    expect(sheetName('x'.repeat(40))).toHaveLength(31);
    expect(sheetName('')).toBe('usuario');
  });
});

describe('PdfReportService', () => {
  const service = new PdfReportService(
    new ConfigService({ REPORT_FONTS_DIR: join(process.cwd(), 'fonts') }),
  );

  it.each([
    ['with comments', report],
    ['empty', { ...report, data: [] }],
  ])('builds a PDF (%s)', async (_label, data) => {
    const pdf = await service.build(data);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });
});

describe('report e-mail template', () => {
  it('is an HTML body (api-mail wraps it)', () => {
    const html = dailyReportEmailHtml();
    expect(html.trim()).toMatch(/^<body[\s>]/i);
    expect(html.trim()).toMatch(/<\/body>$/i);
  });
});

describe('ReportsScheduler', () => {
  const schedule = cron.schedule as unknown as jest.Mock;
  const build = (
    values: Record<string, string>,
    run = jest.fn(async () => ({ sent: 0, failed: 0 })),
  ) => ({
    run,
    scheduler: new ReportsScheduler(
      { run } as never,
      new ConfigService(values),
    ),
  });

  beforeEach(() => schedule.mockClear());

  it('schedules daily at 23:55 in the app time zone (it fired every second of minute 1)', () => {
    build({ NODE_ENV: 'production' }).scheduler.onApplicationBootstrap();
    expect(schedule).toHaveBeenCalledWith(
      DEFAULT_REPORT_CRON,
      expect.any(Function),
      { timezone: 'America/Bogota' },
    );
    expect(DEFAULT_REPORT_CRON).toBe('0 55 23 * * *');
  });

  it('honours REPORTS_CRON and APP_TIMEZONE; rejects an invalid expression', () => {
    build({
      REPORTS_ENABLED: 'true',
      REPORTS_CRON: '0 0 6 * * *',
      APP_TIMEZONE: 'UTC',
    }).scheduler.onApplicationBootstrap();
    expect(schedule).toHaveBeenCalledWith('0 0 6 * * *', expect.any(Function), {
      timezone: 'UTC',
    });
    expect(() =>
      build({
        REPORTS_ENABLED: 'true',
        REPORTS_CRON: 'cada dia',
      }).scheduler.onApplicationBootstrap(),
    ).toThrow(/REPORTS_CRON/);
  });

  it('is off in tests and when REPORTS_ENABLED=false', () => {
    build({ NODE_ENV: 'test' }).scheduler.onApplicationBootstrap();
    build({
      NODE_ENV: 'production',
      REPORTS_ENABLED: 'false',
    }).scheduler.onApplicationBootstrap();
    expect(schedule).not.toHaveBeenCalled();
  });

  it('stops the task on shutdown', () => {
    const { scheduler } = build({ REPORTS_ENABLED: 'true' });
    scheduler.onApplicationBootstrap();
    const task = schedule.mock.results[0].value;
    scheduler.onApplicationShutdown();
    expect(task.stop).toHaveBeenCalled();
  });

  it('never runs twice at the same time, and survives a failing run', async () => {
    let finish!: () => void;
    const run = jest.fn(
      () =>
        new Promise<{ sent: number; failed: number }>(
          (resolve) => (finish = () => resolve({ sent: 1, failed: 0 })),
        ),
    );
    const { scheduler } = build({}, run);

    const first = scheduler.runOnce();
    await scheduler.runOnce();
    expect(run).toHaveBeenCalledTimes(1);
    finish();
    await first;

    run.mockRejectedValueOnce(new Error('db down'));
    await expect(scheduler.runOnce()).resolves.toBeUndefined();
    expect(run).toHaveBeenCalledTimes(2);
  });
});
