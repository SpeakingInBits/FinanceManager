/** Formats an epoch-millis timestamp as a short localized date, e.g. "Jul 6, 2026". */
export function formatDate(millis: number): string {
  return new Date(millis).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Converts a <input type="date"> value ("YYYY-MM-DD") to epoch millis at local midnight. */
export function dateInputToMillis(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1).getTime();
}

/** Converts epoch millis to a <input type="date"> value ("YYYY-MM-DD"). */
export function millisToDateInput(millis: number): string {
  const d = new Date(millis);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns [startOfMonth, endOfMonth] epoch millis bounds for the month containing `millis`. */
export function monthBounds(millis: number): [number, number] {
  const d = new Date(millis);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  return [start, end];
}

/** Epoch millis for the 1st of the month containing `millis`. */
export function monthStart(millis: number): number {
  return monthBounds(millis)[0];
}

/** Epoch millis for the 1st of the month `n` months after the month containing `monthMillis`. */
export function addMonths(monthMillis: number, n: number): number {
  const d = new Date(monthMillis);
  return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime();
}

/** Number of days in the month containing `monthMillis`. */
export function daysInMonth(monthMillis: number): number {
  const d = new Date(monthMillis);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Epoch millis for `day` within the month containing `monthMillis`, clamped to that month's length. */
export function dayInMonth(monthMillis: number, day: number): number {
  const d = new Date(monthMillis);
  return new Date(d.getFullYear(), d.getMonth(), Math.min(day, daysInMonth(monthMillis))).getTime();
}
