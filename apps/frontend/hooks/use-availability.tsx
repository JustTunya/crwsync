import axios from 'axios';
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { checkAvailability } from '@/services/auth.service';

export function useAvailability(field: 'email' | 'username', value: string, validator?: (value: string) => boolean): { available: boolean, message?: string } | undefined {
  const [debounced] = useDebounce(value, 500);
  const [availability, setAvailability] = useState<{ available: boolean, message?: string } | undefined>(undefined);

  const condition = validator ? validator(debounced) : true;

  useEffect(() => {
    const term = debounced.trim();

    if (!condition && term) {
      setAvailability({ available: false, message: `This ${field} is invalid` });
      return;
    }

    if (!term) {
      setAvailability(undefined);
      return;
    }

    let isCancelled = false;
    const check = async () => {
      try {
        const result = await checkAvailability(field, debounced);
        if (!isCancelled) {
          setAvailability({
            available: result.available,
            message: result.available ? undefined : `This ${field} is already taken`
          });
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          // console.error('Error checking availability:', error.response?.data);
        } else {
          // console.error('Unexpected error:', error);
        }
        if (!isCancelled) {
          setAvailability(undefined);
        }
      }
    };

    check();

    return () => {
      isCancelled = true;
    };
  }, [debounced, field]);

  return availability;
}
