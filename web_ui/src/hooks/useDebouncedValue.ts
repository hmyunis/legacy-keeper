import { useEffect, useMemo, useState } from 'react';

interface UseDebouncedValueOptions<T> {
  delay?: number;
  normalize?: (value: T) => T;
}

export const useDebouncedValue = <T,>(
  value: T,
  options?: UseDebouncedValueOptions<T>
) => {
  const delay = options?.delay ?? 400;
  const normalize = options?.normalize;

  const normalizedValue = useMemo(
    () => (normalize ? normalize(value) : value),
    [normalize, value]
  );

  const [debouncedValue, setDebouncedValue] = useState<T>(normalizedValue);

  useEffect(() => {
    if (delay <= 0) {
      setDebouncedValue(normalizedValue);
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedValue(normalizedValue);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delay, normalizedValue]);

  return debouncedValue;
};

