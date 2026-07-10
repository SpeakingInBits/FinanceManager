import { describe, it, expect } from 'vitest';
import { formatCents, parseToCents } from './currency';

describe('formatCents', () => {
  it('formats whole-dollar cents', () => {
    expect(formatCents(1000)).toBe('$10.00');
  });

  it('formats fractional cents', () => {
    expect(formatCents(1050)).toBe('$10.50');
  });

  it('formats zero', () => {
    expect(formatCents(0)).toBe('$0.00');
  });

  it('formats large amounts with thousands separators', () => {
    expect(formatCents(120000)).toBe('$1,200.00');
  });

  it('formats negative amounts', () => {
    expect(formatCents(-500)).toBe('-$5.00');
  });
});

describe('parseToCents', () => {
  it('parses a plain decimal string', () => {
    expect(parseToCents('10.50')).toBe(1050);
  });

  it('parses an integer string', () => {
    expect(parseToCents('10')).toBe(1000);
  });

  it('strips currency symbols and whitespace', () => {
    expect(parseToCents(' $10.50 ')).toBe(1050);
  });

  it('rounds sub-cent precision to the nearest cent', () => {
    expect(parseToCents('10.505')).toBe(1051);
  });

  it('returns 0 for empty input', () => {
    expect(parseToCents('')).toBe(0);
  });

  it('returns 0 for non-numeric input', () => {
    expect(parseToCents('abc')).toBe(0);
  });

  it('parses negative values', () => {
    expect(parseToCents('-5.25')).toBe(-525);
  });
});
