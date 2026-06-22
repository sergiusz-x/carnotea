import 'i18next';

import type auth from '../locales/en/auth.json';
import type common from '../locales/en/common.json';
import type forms from '../locales/en/forms.json';
import type fuelLogs from '../locales/en/fuel-logs.json';
import type health from '../locales/en/health.json';
import type issues from '../locales/en/issues.json';
import type landing from '../locales/en/landing.json';
import type nav from '../locales/en/nav.json';
import type profile from '../locales/en/profile.json';
import type reminders from '../locales/en/reminders.json';
import type vehicles from '../locales/en/vehicles.json';

// Make `t()` keys type-safe and namespace-aware. English is the source of truth
// for available keys; `pl` must mirror the same shape (ADR-0007).
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      forms: typeof forms;
      health: typeof health;
      issues: typeof issues;
      landing: typeof landing;
      auth: typeof auth;
      nav: typeof nav;
      profile: typeof profile;
      reminders: typeof reminders;
      vehicles: typeof vehicles;
      'fuel-logs': typeof fuelLogs;
    };
  }
}
