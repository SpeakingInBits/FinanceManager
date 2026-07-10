import { describe, it, expect } from 'vitest';
import {
  formatDate,
  dateInputToMillis,
  millisToDateInput,
  monthBounds,
  startOfMonth,
  shiftMonth,
  formatMonthYear,
} from './date';

describe('dateInputToMillis / millisToDateInput', () => {
  it('round-trips a date-input value', () => {
    const millis = dateInputToMillis('2026-07-10');
    expect(millisToDateInput(millis)).toBe('2026-07-10');
  });

  it('parses year/month/day at local midnight', () => {
    const d = new Date(dateInputToMillis('2026-01-31'));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(31);
    expect(d.getHours()).toBe(0);
  });

  it('pads single-digit month/day in millisToDateInput', () => {
    const millis = new Date(2026, 0, 5).getTime();
    expect(millisToDateInput(millis)).toBe('2026-01-05');
  });
});

describe('monthBounds', () => {
  it('returns the first and last instant of the month containing the date', () => {
    const [start, end] = monthBounds(new Date(2026, 6, 15).getTime());
    const startDate = new Date(start);
    const endDate = new Date(end);
    expect(startDate.getDate()).toBe(1);
    expect(startDate.getMonth()).toBe(6);
    expect(startDate.getHours()).toBe(0);
    expect(endDate.getMonth()).toBe(6);
    expect(endDate.getDate()).toBe(31);
    expect(endDate.getHours()).toBe(23);
  });

  it('handles February in a leap year', () => {
    const [, end] = monthBounds(new Date(2024, 1, 10).getTime());
    expect(new Date(end).getDate()).toBe(29);
  });

  it('handles February in a non-leap year', () => {
    const [, end] = monthBounds(new Date(2025, 1, 10).getTime());
    expect(new Date(end).getDate()).toBe(28);
  });
});

describe('startOfMonth', () => {
  it('normalizes any day in the month to day 1 at midnight', () => {
    const result = startOfMonth(new Date(2026, 6, 27, 13, 45).getTime());
    const d = new Date(result);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});

describe('shiftMonth', () => {
  it('moves forward by a positive delta', () => {
    const start = new Date(2026, 6, 1).getTime();
    const result = new Date(shiftMonth(start, 2));
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(8);
  });

  it('moves backward by a negative delta', () => {
    const start = new Date(2026, 6, 1).getTime();
    const result = new Date(shiftMonth(start, -1));
    expect(result.getMonth()).toBe(5);
  });

  it('rolls over to the previous year', () => {
    const start = new Date(2026, 0, 15).getTime();
    const result = new Date(shiftMonth(start, -1));
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(11);
  });

  it('rolls over to the next year', () => {
    const start = new Date(2026, 11, 15).getTime();
    const result = new Date(shiftMonth(start, 1));
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(0);
  });
});

describe('formatMonthYear', () => {
  it('formats as long month + year', () => {
    const millis = new Date(2026, 6, 1).getTime();
    expect(formatMonthYear(millis)).toBe('July 2026');
  });
});

describe('formatDate', () => {
  it('formats a short localized date', () => {
    const millis = new Date(2026, 6, 6).getTime();
    expect(formatDate(millis)).toContain('2026');
    expect(formatDate(millis)).toContain('6');
  });
});
