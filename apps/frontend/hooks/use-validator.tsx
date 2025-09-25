import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

interface ValidatorResult {
  value: boolean | undefined;
  meta?: any;
}

export function useValidator(value: string, validator: (value: string) => boolean | { level: 'weak' | 'medium' | 'strong' }): ValidatorResult {
  const [debounced] = useDebounce(value, 500);
  const [isValid, setIsValid] = useState<boolean | undefined>(undefined);
  const [meta, setMeta] = useState<any>(undefined);

  useEffect(() => {
    const term = debounced.trim();

    if (!term) {
      setIsValid(undefined);
      setMeta(undefined);
      return;
    }

    let isCancelled = false;
    const validate = () => {
      try {
        const result = validator(term);
        if (!isCancelled) {
          if (typeof result === 'object' && result !== null) {
            setIsValid(result.level !== 'weak');
            setMeta(result);
          } else {
            setIsValid(result);
            setMeta(undefined);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          setIsValid(undefined);
          setMeta(undefined);
        }
      }
    }

    validate();

    return () => {
      isCancelled = true;
    };
  }, [debounced, validator]);

  return { value: isValid, meta };
}
