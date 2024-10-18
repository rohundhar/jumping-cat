

export function extractValidParams<K extends string>(props: { params: Record<string,any>, ValidKeys: K[]}): Partial<Record<K, string>> {
  const { params, ValidKeys } = props;

  const queryParams: Partial<Record<K, string>> = {};

  if (!params) {
    return queryParams;
  }

  for (const [key, value] of params.entries()) {
    if (ValidKeys.includes(key as K)) {
      queryParams[key as K] = value;
    }
  }

  return queryParams;
};

export function createValidKeys<T>(): (keyof T)[] {
  // Create a dummy object to get the keys. Setting the properties to undefined is crucial for optional properties.
  const dummyObj: Record<keyof T, undefined> = {} as Record<keyof T, undefined>;
  for (const key in ({} as T)) {
    dummyObj[key] = undefined;
  }
  return Object.keys(dummyObj) as (keyof T)[];
}

