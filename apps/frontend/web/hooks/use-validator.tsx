import { useDebounce } from "use-debounce";

type StrengthLevel = "weak" | "medium" | "strong";

export interface ValidatorMeta {
  legit: boolean;
  level: StrengthLevel;
}

interface ValidatorResult {
  value: boolean | undefined;
  legit: boolean | undefined;
  meta?: ValidatorMeta;
}

export function useValidator(value: string, validator: (value: string) => boolean | ValidatorMeta): ValidatorResult {
  const [debounced] = useDebounce(value, 500);

  const term = debounced.trim();

  if (!term) {
    return { value: undefined, legit: undefined, meta: undefined };
  }

  try {
    const result = validator(term);

    if (typeof result === "object" && result !== null) {
      const meta: ValidatorMeta = result;
      return {
        value: meta.level !== "weak",
        legit: meta.legit,
        meta,
      };
    }

    return {
      value: result,
      legit: undefined,
      meta: undefined,
    };
  } catch {
    return {
      value: undefined,
      legit: undefined,
      meta: undefined,
    };
  }
}