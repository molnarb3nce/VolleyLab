import { Transform } from 'class-transformer';

/** Trims surrounding whitespace of string values. */
export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

/** Trims and lower-cases string values (for emails). */
export const NormalizeEmail = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
