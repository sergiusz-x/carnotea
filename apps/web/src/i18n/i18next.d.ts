import 'i18next';

import type common from '../locales/en/common.json';
import type forms from '../locales/en/forms.json';
import type health from '../locales/en/health.json';
import type landing from '../locales/en/landing.json';

// Make `t()` keys type-safe and namespace-aware. English is the source of truth
// for available keys; `pl` must mirror the same shape (ADR-0007).
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      forms: typeof forms;
      health: typeof health;
      landing: typeof landing;
    };
  }
}
