import { describe, expect, it } from 'vitest';

import { validateEnv } from './env.js';

const baseConfig = {
  DATABASE_URL: 'postgresql://carnotea:secret@postgres:5432/carnotea',
  BETTER_AUTH_SECRET: 'a-real-generated-secret-value',
  BETTER_AUTH_URL: 'https://carnotea.example.com',
};

describe('validateEnv', () => {
  it('accepts a complete development config', () => {
    expect(() => validateEnv({ ...baseConfig, NODE_ENV: 'development' })).not.toThrow();
  });

  it('throws when a required var is missing', () => {
    expect(() => validateEnv({ NODE_ENV: 'development' })).toThrow(/DATABASE_URL/);
  });

  it('rejects the .env.example placeholder BETTER_AUTH_SECRET in production', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        NODE_ENV: 'production',
        BETTER_AUTH_SECRET: 'replace-me-with-openssl-rand-base64-32',
      }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it('rejects the .env.example placeholder DB password in production', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://carnotea:carnotea_dev_password@postgres:5432/carnotea',
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('allows the same placeholder values outside production', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        NODE_ENV: 'development',
        BETTER_AUTH_SECRET: 'replace-me-with-openssl-rand-base64-32',
      }),
    ).not.toThrow();
  });

  it('accepts a real production config', () => {
    expect(() => validateEnv({ ...baseConfig, NODE_ENV: 'production' })).not.toThrow();
  });
});
