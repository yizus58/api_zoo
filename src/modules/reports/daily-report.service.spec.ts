import { ConfigService } from '@nestjs/config';
import { DailyReportService, REPORT_SUBJECT } from './daily-report.service';
import { UserReport } from './report.types';

const reportFor = (user: string): UserReport => ({
  user: `${user}-0000-uuid`,
  email: `${user}@mail.com`,
  data: [],
});

describe('DailyReportService', () => {
  const setup = (reports: UserReport[]) => {
    const deps = {
      dailyComments: { collect: jest.fn(async () => reports) },
      excel: { build: jest.fn(async () => Buffer.from('xlsx')) },
      pdf: { build: jest.fn(async () => Buffer.from('pdf')) },
      storage: { upload: jest.fn(), delete: jest.fn(async () => undefined) },
      messaging: { publish: jest.fn(async () => undefined) },
    };
    let n = 0;
    deps.storage.upload.mockImplementation(async () => `key-${++n}`);
    const service = new DailyReportService(
      deps.dailyComments as never,
      deps.excel as never,
      deps.pdf as never,
      deps.storage as never,
      deps.messaging as never,
      new ConfigService({ APP_TIMEZONE: 'America/Bogota' }),
    );
    return { deps, service };
  };
  const now = new Date('2026-03-11T02:00:00Z'); // 2026-03-10 21:00 in Bogotá

  it('nothing to do without comments', async () => {
    const { deps, service } = setup([]);
    await expect(service.run(now)).resolves.toEqual({ sent: 0, failed: 0 });
    expect(deps.storage.upload).not.toHaveBeenCalled();
  });

  it('publishes one message per employee, file names dated in the app time zone', async () => {
    const { deps, service } = setup([reportFor('ana')]);
    await expect(service.run(now)).resolves.toEqual({ sent: 1, failed: 0 });
    expect(deps.dailyComments.collect).toHaveBeenCalledWith(now);
    expect(deps.messaging.publish).toHaveBeenCalledWith({
      type: 'email_notification',
      data: {
        userId: 'ana-0000-uuid',
        recipients: 'ana@mail.com',
        subject: REPORT_SUBJECT,
        html: expect.stringContaining('<body'),
        attachments: [
          {
            name_file: 'reporte-diario-comentarios-ana-0000-2026-03-10.xlsx',
            s3_name: 'key-1',
          },
          {
            name_file: 'reporte-diario-comentarios-ana-0000-2026-03-10.pdf',
            s3_name: 'key-2',
          },
        ],
      },
      timestamp: now.toISOString(),
    });
  });

  it('a failure for one employee cleans up its uploads and the rest still go out', async () => {
    const { deps, service } = setup([reportFor('ana'), reportFor('bob')]);
    deps.messaging.publish.mockRejectedValueOnce(new Error('broker down'));
    await expect(service.run(now)).resolves.toEqual({ sent: 1, failed: 1 });
    expect(deps.storage.delete.mock.calls).toEqual([['key-1'], ['key-2']]);
  });

  it('a failure while building the files uploads nothing', async () => {
    const { deps, service } = setup([reportFor('ana')]);
    deps.pdf.build.mockRejectedValueOnce(new Error('font missing'));
    await expect(service.run(now)).resolves.toEqual({ sent: 0, failed: 1 });
    expect(deps.storage.upload).not.toHaveBeenCalled();
  });
});
