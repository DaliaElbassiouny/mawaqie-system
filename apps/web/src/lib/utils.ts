import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const MISSING_VALUE = '—';

type NumericInput = number | string | null | undefined;
type DateInput = string | Date | null | undefined;

const LATIN_NUMBER_LOCALE = 'en-US';
const ARABIC_LATIN_DIGIT_LOCALE = 'ar-SA-u-nu-latn';
const MILLION = 1_000_000;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toEnglishDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

export function formatText(value: string | null | undefined, fallback = MISSING_VALUE): string {
  const trimmed = value?.trim();
  if (!trimmed || /\?{3,}/.test(trimmed)) return fallback;
  return trimmed;
}

function toFiniteNumber(value: NumericInput): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function toDate(value: DateInput): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function localeWithEnglishDigits(locale: string): string {
  return locale.startsWith('ar') ? ARABIC_LATIN_DIGIT_LOCALE : 'en-GB';
}

export function formatNumber(
  value: NumericInput,
  options: Intl.NumberFormatOptions = {},
): string {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return MISSING_VALUE;

  return toEnglishDigits(
    new Intl.NumberFormat(LATIN_NUMBER_LOCALE, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      ...options,
    }).format(numeric),
  );
}

export function formatCompactNumber(
  value: NumericInput,
  options: Intl.NumberFormatOptions = {},
): string {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return MISSING_VALUE;

  if (Math.abs(numeric) >= MILLION) {
    return `${formatNumber(numeric / MILLION, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    })}M`;
  }

  return formatNumber(numeric, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  });
}

export function formatCurrency(
  amount: NumericInput,
  currency = 'SAR',
): string {
  const numeric = toFiniteNumber(amount);
  if (numeric === null) return MISSING_VALUE;
  return `${formatCompactNumber(numeric)} ${currency}`;
}

export function formatCurrencySAR(amount: NumericInput): string {
  return formatCurrency(amount, 'SAR');
}

export function formatPercent(value: NumericInput, maximumFractionDigits = 0): string {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return MISSING_VALUE;
  return `${formatNumber(numeric, { maximumFractionDigits })}%`;
}

export function formatDateWithEnglishDigits(
  date: DateInput,
  locale = 'ar',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  const parsed = toDate(date);
  if (!parsed) return MISSING_VALUE;

  return toEnglishDigits(
    new Intl.DateTimeFormat(localeWithEnglishDigits(locale), options).format(parsed),
  );
}

export function formatDateTimeWithEnglishDigits(
  date: DateInput,
  locale = 'ar',
): string {
  return formatDateWithEnglishDigits(date, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(date: DateInput, locale = 'ar-SA'): string {
  return formatDateWithEnglishDigits(date, locale);
}

export function formatDateTime(date: DateInput, locale = 'ar-SA'): string {
  return formatDateTimeWithEnglishDigits(date, locale);
}

export function getInitials(nameAr?: string, nameEn?: string): string {
  const name = nameAr || nameEn || '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
}
