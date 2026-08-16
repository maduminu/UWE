export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong';
};

export const normalizeEnumValue = <T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
): T[number] | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.toUpperCase();

  if (allowedValues.includes(normalized as T[number])) {
    return normalized as T[number];
  }

  return undefined;
};
