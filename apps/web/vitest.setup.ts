import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Initialize i18next once for the whole test run so components that call
// useTranslation render real (English-default) copy instead of raw keys.
import './src/i18n';

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue([]),
  set: vi.fn().mockResolvedValue(undefined),
}));

afterEach(cleanup);
