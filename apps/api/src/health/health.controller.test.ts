import { describe, expect, it } from 'vitest';

import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('returns an ok status from healthz', () => {
    const controller = new HealthController();

    expect(controller.healthz()).toEqual({ status: 'ok' });
  });
});
