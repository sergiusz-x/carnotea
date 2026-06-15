import { resolve } from 'node:path';

import { vitestBaseConfig } from '@carnotea/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  vitestBaseConfig,
  defineConfig({
    resolve: {
      alias: {
        '@/components': resolve(import.meta.dirname, 'src/components'),
        '@/lib': resolve(import.meta.dirname, 'src/lib'),
        '@/features': resolve(import.meta.dirname, 'src/features'),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    },
  }),
);
