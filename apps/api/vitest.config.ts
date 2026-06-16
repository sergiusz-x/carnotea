import { vitestBaseConfig } from '@carnotea/vitest-config';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  vitestBaseConfig,
  defineConfig({
    // Vite 8 transforms TS with Oxc natively, which supports the legacy
    // experimental decorators + emitDecoratorMetadata that NestJS DI relies on.
    // This replaces unplugin-swc for tests (build still uses SWC via nest build).
    oxc: {
      decorator: {
        legacy: true,
        emitDecoratorMetadata: true,
      },
    },
  }),
);
