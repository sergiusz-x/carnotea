import { z } from 'zod';

import i18n from '../../i18n';

// Zod 4 replaced z.setErrorMap() with z.config({ customError }) and deprecated
// ZodIssueCode in favor of raw string literals. `origin` replaces `type` from
// v3; `invalid_string` is now `invalid_format`.

export function configureZodErrorMap(): void {
  z.config({
    customError: (issue) => {
      const t = i18n.getFixedT(null, 'forms');

      switch (issue.code) {
        case 'invalid_type':
          return t('errors.required');

        case 'too_small': {
          const { minimum, origin } = issue as { minimum: number; origin?: string };
          if (origin === 'number') return t('errors.number.min', { min: minimum });
          if (minimum === 1) return t('errors.required');
          return t('errors.string.min', { min: minimum });
        }

        case 'too_big': {
          const { maximum, origin } = issue as { maximum: number; origin?: string };
          if (origin === 'number') return t('errors.number.max', { max: maximum });
          return t('errors.string.max', { max: maximum });
        }

        case 'invalid_format': {
          const { format } = issue as { format?: string };
          if (format === 'uuid') return t('errors.format.uuid');
          if (format === 'email') return t('errors.format.email');
          if (format === 'url') return t('errors.format.url');
          return t('errors.format.default');
        }

        default:
          return t('errors.invalid');
      }
    },
  });
}
