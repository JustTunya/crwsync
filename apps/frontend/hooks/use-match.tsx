import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

export function useMatch(value1: string, value2: string) {
  const [debounced1] = useDebounce(value1, 500);
  const [debounced2] = useDebounce(value2, 500);
  const [isMatch, setIsMatch] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const term1 = debounced1.trim();
    const term2 = debounced2.trim();

    if (!term1 || !term2) {
      setIsMatch(undefined);
      return;
    }

    setIsMatch(term1 === term2);
  }, [debounced1, debounced2]);

  return isMatch;
}