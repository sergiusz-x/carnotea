import globals from 'globals';

import { base } from './base.js';

export const node = [
  ...base,
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
];

export default node;
