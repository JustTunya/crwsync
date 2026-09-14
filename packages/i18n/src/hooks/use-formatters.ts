import { useI18n } from "../context/i18n.provider";
import { formatDate as fd, formatRelativeTime as frt } from "../utils/format-date";
import { formatNumber as fn, formatCompactNumber as fcn } from "../utils/format-number";

export function useFormatters() {
  const { locale } = useI18n();

  return {
    formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      fd(date, options, locale),
    formatRelativeTime: (date: Date | string | number) =>
      frt(date, locale),
    formatNumber: (val: number, options?: Intl.NumberFormatOptions) =>
      fn(val, options, locale),
    formatCompactNumber: (val: number) =>
      fcn(val, locale)
  };
}
