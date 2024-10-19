

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