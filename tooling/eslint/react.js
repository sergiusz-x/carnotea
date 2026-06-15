import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

import { base } from './base.js';

export const react = [
  ...base,
  {
    files: ['**/*.{jsx,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'jsx-a11y': jsxA11yPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
    },
    settings: {
      react: {
        // Pinned (not 'detect'): eslint-plugin-react's autodetection calls the
        // ESLint 9 `context.getFilename()` API, which was removed in ESLint 10
        // and crashes the lint. The monorepo standardizes on React 19.
        version: '19.0',
      },
    },
  },
];

export default react;
