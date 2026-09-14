import { useI18n } from "../context/i18n.provider";

export function useLocale() {
  const { locale, setLocale, dir, isRtl } = useI18n();
  return { locale, setLocale, dir, isRtl };
}
