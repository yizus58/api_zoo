export interface DayRange {
  startOfDay: Date;
  endOfDay: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Offset in ms between local time in `timeZone` and UTC at the instant `at`. */
function timeZoneOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/**
 * The calendar day containing `now` in `timeZone` (e.g. America/Bogota), as UTC instants.
 * Using UTC days instead made the 19:00-24:00 Bogotá comments fall into the next day.
 */
export function dayRangeIn(timeZone: string, now: Date = new Date()): DayRange {
  const offset = timeZoneOffsetMs(timeZone, now);
  const local = new Date(now.getTime() + offset);
  const localMidnightAsUtc = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  const startOfDay = new Date(localMidnightAsUtc - offset);
  return {
    startOfDay,
    endOfDay: new Date(startOfDay.getTime() + DAY_MS - 1),
  };
}

/** YYYY-MM-DD of `now` in `timeZone`. */
export function localDate(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
