import { resolve } from 'node:path';

import { vitestBaseConfig } from '@carnotea/vitest-config';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  vitestBaseConfig,
  defineConfig({
    resolve: {
      alias: {
        '@/components': resolve(import.meta.dirname, 'src/components'),
        '@/features': resolve(import.meta.dirname, 'src/features'),
        '@/lib': resolve(import.meta.dirname, 'src/lib'),
        '@/routes': resolve(import.meta.dirname, 'src/routes'),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    },
  }),
);
