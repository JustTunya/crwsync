import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

interface ValidatorResult {
  value: boolean | undefined;
  legit: boolean | undefined;
  meta?: any;
}

export function useValidator(value: string, validator: (value: string) => boolean | { legit: boolean, level: 'weak' | 'medium' | 'strong' }): ValidatorResult {
  const [debounced] = useDebounce(value, 500);
  const [isValid, setIsValid] = useState<boolean | undefined>(undefined);
  const [legit, setLegit] = useState<boolean | undefined>(undefined);
  const [meta, setMeta] = useState<any>(undefined);

  useEffect(() => {
    const term = debounced.trim();

    if (!term) {
      setIsValid(undefined);
      setLegit(undefined);
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
            setLegit(result.legit);
            setMeta(result);
          } else {
            setIsValid(result);
            setLegit(undefined);
            setMeta(undefined);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          setIsValid(undefined);
          setLegit(undefined);
          setMeta(undefined);
        }
      }
    }

    validate();

    return () => {
      isCancelled = true;
    };
  }, [debounced, validator]);

  return { value: isValid, legit, meta };
}
