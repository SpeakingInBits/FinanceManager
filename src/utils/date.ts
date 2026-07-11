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

/** Returns epoch millis for the first day of the month containing `millis`. */
export function startOfMonth(millis: number): number {
  const d = new Date(millis);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

/** Returns the start-of-month `delta` months away from the month containing `millis`. */
export function shiftMonth(millis: number, delta: number): number {
  const d = new Date(millis);
  return new Date(d.getFullYear(), d.getMonth() + delta, 1).getTime();
}

/** Formats a month as e.g. "July 2026". */
export function formatMonthYear(millis: number): string {
  return new Date(millis).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}
