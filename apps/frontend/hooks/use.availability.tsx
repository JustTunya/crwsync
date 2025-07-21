import axios from 'axios';
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { checkAvailability } from '@/services/auth.service';

export function useAvailability(field: 'email' | 'username', value: string) {
  const [debounced] = useDebounce(value, 500);
  const [availability, setAvailability] = useState<boolean | null>(null);

  useEffect(() => {
    const term = debounced.trim();

    if (!term) {
      setAvailability(null);
      return;
    }

    let isCancelled = false;
    const check = async () => {
      try {
        const result = await checkAvailability(field, debounced);
        if (!isCancelled) {
          setAvailability(result.available);
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error('Error checking availability:', error.response?.data);
        } else {
          console.error('Unexpected error:', error);
        }
        if (!isCancelled) {
          setAvailability(null);
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
