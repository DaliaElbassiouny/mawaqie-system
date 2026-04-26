import { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from '@cdc/shared';

export const parseQueryNumber = (value?: string): number | undefined => {
  if (!value?.trim()) return undefined;
  return Number(value);
};

export const parseQueryBoolean = (value?: string): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

export const sanitizePage = (value: number | undefined) =>
  Number.isInteger(value) && value !== undefined && value > 0 ? value : DEFAULT_PAGE;

export const sanitizeLimit = (value: number | undefined) =>
  Math.min(
    Number.isInteger(value) && value !== undefined && value > 0 ? value : DEFAULT_LIMIT,
    MAX_LIMIT,
  );
