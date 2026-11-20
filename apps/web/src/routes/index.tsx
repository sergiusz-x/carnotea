import { createRoute, redirect } from '@tanstack/react-router';

import { App } from '../App';

import { rootRoute } from './root';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: App,
});

export const indexHtmlRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/index.html',
  beforeLoad: () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router uses thrown redirects for loader navigation.
    throw redirect({ to: '/' });
  },
});
