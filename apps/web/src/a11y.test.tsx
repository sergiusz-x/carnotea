import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { ThemeProvider } from '@/components/ThemeProvider';

import { App } from './App';

function renderApp() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );
}

describe('Accessibility Audit', () => {
  it('App landing page should have no accessibility violations', async () => {
    const { container } = renderApp();
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types don't augment vitest Assertion
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    expect(results).toHaveNoViolations();
  });
});
