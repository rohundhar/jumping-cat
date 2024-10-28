

export function extractValidParams<K extends string>(props: { params: Record<string,any>, ValidKeys: K[]}): Partial<Record<K, string>> {
  const { params, ValidKeys } = props;

  const queryParams: Partial<Record<K, string>> = {};

  if (!params) {
    return queryParams;
  }

  for (const [key, value] of Object.entries(params)) {
    if (ValidKeys.includes(key as K)) {
      queryParams[key as K] = value;
    }
  }

  return queryParams;
};


export const allKeyed = async <T extends Record<string, Promise<any>>>(
  namedPromises: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> => {
  const entries = Object.entries(namedPromises);
  const results = await Promise.all(
    entries.map(async ([key, promise]) => [key, await promise])
  );

  return Object.fromEntries(results) as { [K in keyof T]: Awaited<T[K]> };
};