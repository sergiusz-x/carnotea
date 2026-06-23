import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().min(1).default('0.0.0.0'),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.url(),
  // CORS — comma-separated list of allowed origins; defaults to localhost for dev
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3001'),
  // Rate limiting — global and auth-tight limits
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  // Body-size limit in bytes (1 MB default)
  BODY_LIMIT: z.coerce.number().int().positive().default(1_048_576),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}
