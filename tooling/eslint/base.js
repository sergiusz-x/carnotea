import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

const ignoredPaths = [
  '**/.cache/**',
  '**/.turbo/**',
  '**/build/**',
  '**/coverage/**',
  '**/dist/**',
  '**/node_modules/**',
  // Hand-written declaration files (e.g. tooling/vitest/base.d.ts, vite-env.d.ts)
  // are types, not code, and live outside any tsconfig `include`, so the typed
  // project service can't resolve them. Generated ones already sit under dist/.
  '**/*.d.ts',
];

const sourceFiles = ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'];
const typeScriptFiles = ['**/*.{ts,tsx,mts,cts}'];
const javaScriptFiles = ['**/*.{js,jsx,mjs,cjs}'];

export const base = tseslint.config(
  { ignores: ignoredPaths },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    files: typeScriptFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
      },
    },
  },
  {
    files: javaScriptFiles,
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: sourceFiles,
    plugins: {
      'import-x': importPlugin,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports',
          prefer: 'type-imports',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'import-x/order': [
        'error',
        {
          alphabetize: {
            caseInsensitive: true,
            order: 'asc',
          },
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],
    },
  },
);

export default base;
