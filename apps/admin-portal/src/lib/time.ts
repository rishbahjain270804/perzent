/**
 * Timezone helpers. All attendance dates are stored as `work_date` = UTC midnight of the
 * company's LOCAL calendar date, so a shift at 01:00 local time on the 5th belongs to the 5th.
 */
const DEFAULT_TZ = 'Asia/Kolkata';

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function safeTimeZone(tz?: string | null): string {
  return tz && isValidTimeZone(tz) ? tz : DEFAULT_TZ;
}

/** 'YYYY-MM-DD' of `at` in the given IANA timezone. */
export function localDateString(tz: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTimeZone(tz),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** UTC-midnight Date representing the local calendar date (matches Prisma `@db.Date`). */
export function workDateFor(tz: string, at: Date = new Date()): Date {
  return new Date(`${localDateString(tz, at)}T00:00:00.000Z`);
}

export function workDateFromString(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function workDateToString(workDate: Date): string {
  return workDate.toISOString().slice(0, 10);
}

/** Offset (minutes) of `tz` from UTC at instant `date`. */
export function timeZoneOffsetMinutes(tz: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTimeZone(tz),
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Converts a local wall-clock time ('YYYY-MM-DD' + 'HH:mm') in `tz` to a UTC instant. */
export function zonedTimeToUtc(dateStr: string, hhmm: string, tz: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = hhmm.split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, h, min, 0, 0);
  // Two passes handle offset transitions close to the target instant.
  const firstGuess = naive - timeZoneOffsetMinutes(tz, new Date(naive)) * 60000;
  const offset = timeZoneOffsetMinutes(tz, new Date(firstGuess));
  return new Date(naive - offset * 60000);
}

/** Local 'HH:mm' of `date` in `tz`. */
export function localTimeString(tz: string, date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: safeTimeZone(tz),
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/** Minutes since local midnight for `date` in `tz`. */
export function localMinutesOfDay(tz: string, date: Date): number {
  const [h, m] = localTimeString(tz, date).split(':').map(Number);
  return (h % 24) * 60 + m;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}
