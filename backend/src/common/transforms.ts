/** class-transformer helper: trims surrounding whitespace of string values. */
export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
