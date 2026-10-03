import { Injectable, Provider } from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MAT_NATIVE_DATE_FORMATS,
  NativeDateAdapter,
} from '@angular/material/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';

const DAY_MONTH_YEAR = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/**
 * Reads typed dates as `dd/mm/yyyy`. The native adapter uses `Date.parse`,
 * which would read `03/10/2026` as March 10th.
 */
@Injectable()
export class EsDateAdapter extends NativeDateAdapter {
  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (typeof value !== 'string') {
      return super.parse(value, parseFormat);
    }
    const text = value.trim();
    if (!text) {
      return null;
    }
    const match = DAY_MONTH_YEAR.exec(text);
    if (!match) {
      return this.invalid();
    }
    const [day, month, year] = match.slice(1).map(Number);
    const date = new Date(year, month - 1, day);
    // `new Date` overflows silently (31/02 → 03/03), so reject anything that moved.
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : this.invalid();
  }
}

/**
 * Spanish dates and the default look of every form field. The Spanish texts of the paginator and
 * the calendar are in `material-intl.ts`, provided by the lazy pages that use them.
 */
export function provideMaterial(): Provider[] {
  return [
    { provide: DateAdapter, useClass: EsDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline', subscriptSizing: 'dynamic' },
    },
  ];
}
