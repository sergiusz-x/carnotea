import { node, react } from '@carnotea/eslint-config';

const nodeScripts = node.map((config) => ({
  ...config,
  files: ['scripts/**/*.mjs'],
}));

export default [
  ...react,
  ...nodeScripts,
  {
    // TypeScript provides prop-type checking; the React prop-types runtime rule
    // is redundant for TS files and fires false positives on forwardRef components.
    rules: {
      'react/prop-types': 'off',
    },
  },
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
