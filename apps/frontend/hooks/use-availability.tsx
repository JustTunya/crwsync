import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { checkAvailability } from '@/services/auth.service';

export function useAvailability(field: 'email' | 'username', value: string, validator?: (value: string) => boolean): { available: boolean, valid: boolean,message?: string } | undefined {
  const [debounced] = useDebounce(value, 500);
  const [available, setAvailable] = useState<boolean | undefined>(undefined);

  const term = debounced.trim();
  const valid = validator ? validator(term) : true;

  useEffect(() => {
    if (!term || !valid) return;

    let isCancelled = false;

    const check = async () => {
      try {
        const result = await checkAvailability(field, term);
        if (!isCancelled) {
          setAvailable(result.available);
        }
      } catch {
        if (!isCancelled) {
          setAvailable(undefined);
        }
      }
    };

    check();

    return () => {
      isCancelled = true;
    };
  }, [term, field, valid]);

  if (!term) {
    return undefined;
  }

  if (!valid) {
    return { available: false, valid: false, message: `This ${field} is not valid.` };
  }

  if (available === undefined) {
    return { available: false, valid: true, message: `Checking ${field} availability...` };
  }

  return {
    available,
    valid: true,
    message: available ? `This ${field} is available.` : `This ${field} is already taken.`,
  };
}
