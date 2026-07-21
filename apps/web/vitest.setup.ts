import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
import * as matchers from 'vitest-axe/matchers';
import 'vitest-axe/extend-expect';

expect.extend(matchers);

// Initialize i18next once for the whole test run so components that call
// useTranslation render real (English-default) copy instead of raw keys.
import './src/i18n';

afterEach(cleanup);
