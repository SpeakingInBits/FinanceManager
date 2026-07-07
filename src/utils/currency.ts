const formatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
});

/** Formats integer minor units (cents) as a currency string, e.g. 1050 -> "$10.50". */
export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/** Parses a user-entered decimal string (e.g. "10.50") into integer cents. */
export function parseToCents(input: string): number {
  const normalized = input.trim().replace(/[^0-9.-]/g, '');
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}
