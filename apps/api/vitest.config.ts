import { vitestBaseConfig } from '@carnotea/vitest-config';
import swc from 'unplugin-swc';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  vitestBaseConfig,
  defineConfig({
    // unplugin-swc owns the TS/decorator transform (NestJS needs emitDecoratorMetadata).
    // Disable Vite's built-in Oxc transform so it doesn't also process files — under
    // Vite 8 this is the replacement for the old `esbuild: false` toggle.
    oxc: false,
    plugins: [
      swc.vite({
        jsc: {
          target: 'es2022',
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
        },
      }),
    ],
  }),
);
