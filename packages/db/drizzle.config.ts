import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url:
      process.env['DATABASE_URL'] ??
      'postgresql://carnotea:carnotea_dev_password@localhost:5433/carnotea',
  },
});
