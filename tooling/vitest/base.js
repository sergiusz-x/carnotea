import { defineConfig } from 'vitest/config';

export const vitestBaseConfig = defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'tests/**/*.test.ts', 'tests/**/*.spec.ts'],
  },
});

export default vitestBaseConfig;
