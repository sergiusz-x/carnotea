import { react } from '@carnotea/eslint-config';

export default [
  ...react,
  {
    // Guard against untranslated UI text: every literal rendered as JSX content
    // must go through i18next's t(...) (ADR-0007). Tests assert on literal copy,
    // so they are exempt.
    files: ['src/**/*.tsx'],
    ignores: ['src/**/*.test.tsx'],
    rules: {
      'react/jsx-no-literals': 'error',
    },
  },
];
