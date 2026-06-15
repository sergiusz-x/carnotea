import { node } from '@carnotea/eslint-config';

export default [
  ...node,
  {
    files: ['**/*.module.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];
