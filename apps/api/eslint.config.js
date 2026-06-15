import { node } from '@carnotea/eslint-config';

export default [
  ...node,
  {
    rules: {
      // NestJS module/controller classes are intentionally empty — their config
      // lives in the decorator — so allow an otherwise-extraneous class when it
      // carries a decorator. Covers real `*.module.ts` files and test fixtures.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },
];
