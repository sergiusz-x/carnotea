import { vitestBaseConfig } from '@carnotea/vitest-config';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(vitestBaseConfig, defineConfig({}));
