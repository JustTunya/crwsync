export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale = "en"
): string {
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, options).format(d);
}

export function formatRelativeTime(
  date: Date | string | number,
  locale = "en"
): string {
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const now = Date.now();
  const diffInSeconds = Math.round((d.getTime() - now) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const cutoffs = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity];
  const units: Intl.RelativeTimeFormatUnit[] = ["second", "minute", "hour", "day", "week", "month", "year"];
  const unitIndex = cutoffs.findIndex((cutoff) => Math.abs(diffInSeconds) < cutoff);
  const divisor = unitIndex > 0 ? cutoffs[unitIndex - 1] : 1;

  return rtf.format(Math.round(diffInSeconds / divisor), units[unitIndex]);
}
