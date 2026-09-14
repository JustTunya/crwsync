import { useI18n } from "../context/i18n.provider";

export function useTranslation() {
  const { t, locale, setLocale, dir, isRtl } = useI18n();
  return { t, locale, setLocale, dir, isRtl };
}
