import { dayRangeIn, localDate } from './day-range';

describe('dayRangeIn', () => {
  it('Bogotá day (UTC-5) runs from 05:00Z to 04:59:59.999Z next day', () => {
    const range = dayRangeIn(
      'America/Bogota',
      new Date('2026-03-10T15:00:00Z'),
    );
    expect(range.startOfDay.toISOString()).toBe('2026-03-10T05:00:00.000Z');
    expect(range.endOfDay.toISOString()).toBe('2026-03-11T04:59:59.999Z');
  });

  it('21:00 Bogotá (02:00Z next day) still belongs to the Bogotá day', () => {
    const range = dayRangeIn(
      'America/Bogota',
      new Date('2026-03-11T02:00:00Z'),
    );
    expect(range.startOfDay.toISOString()).toBe('2026-03-10T05:00:00.000Z');
  });

  it('UTC is the plain UTC day', () => {
    const range = dayRangeIn('UTC', new Date('2026-03-10T23:59:59Z'));
    expect(range.startOfDay.toISOString()).toBe('2026-03-10T00:00:00.000Z');
    expect(range.endOfDay.toISOString()).toBe('2026-03-10T23:59:59.999Z');
  });

  it('positive offsets (Asia/Tokyo, UTC+9)', () => {
    const range = dayRangeIn('Asia/Tokyo', new Date('2026-03-10T16:00:00Z'));
    expect(range.startOfDay.toISOString()).toBe('2026-03-10T15:00:00.000Z');
  });

  it('rejects an unknown time zone', () => {
    expect(() => dayRangeIn('Mars/Base')).toThrow(RangeError);
  });
});

describe('localDate', () => {
  it('formats the local calendar date', () => {
    expect(localDate('America/Bogota', new Date('2026-03-11T02:00:00Z'))).toBe(
      '2026-03-10',
    );
    expect(localDate('UTC', new Date('2026-03-11T02:00:00Z'))).toBe(
      '2026-03-11',
    );
  });
});
