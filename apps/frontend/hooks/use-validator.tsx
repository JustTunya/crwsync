import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

export function useValidator(value: string, validator: (value: string) => boolean) {
  const [debounced] = useDebounce(value, 500);
  const [isValid, setIsValid] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const term = debounced.trim();

    if (!term) {
      setIsValid(undefined);
      return;
    }

    let isCancelled = false;
    const validate = () => {
      try {
        const result = validator(term);
        if (!isCancelled) {
          setIsValid(result);
        }
      } catch (error) {
        // console.error('Validation error:', error);
        if (!isCancelled) {
          setIsValid(undefined);
        }
      }
    }

    validate();

    return () => {
      isCancelled = true;
    };
  }, [debounced, validator]);

  return isValid;
}
