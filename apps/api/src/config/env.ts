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
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  // Body-size limit in bytes (1 MB default)
  BODY_LIMIT: z.coerce.number().int().positive().default(1_048_576),
  // --- Mail SMTP (T-051) ---
  // Host is optional: absent → fall back to Mailpit on localhost:1025 (dev only).
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // Branded sender address shown to recipients.
  EMAIL_FROM: z.string().default('CarNotea <noreply@localhost>'),
  // Reply-to address (may differ from sender).
  EMAIL_REPLY_TO: z.string().default('noreply@localhost'),

  // ── Observability: OpenTelemetry (all optional — absent → tracing disabled) ──
  /** OTLP endpoint for exporting traces. When unset → tracing is a no-op. */
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- z.url() returns URL, breaking string contract
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  /** Overrides `service.name` on the tracer resource (default: carnotea-api). */
  OTEL_SERVICE_NAME: z.string().optional(),
  /** Extra comma-separated key=value resource attributes. */
  OTEL_RESOURCE_ATTRIBUTES: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => '  - ' + (issue.path.join('.') || '(root)') + ': ' + issue.message)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}
