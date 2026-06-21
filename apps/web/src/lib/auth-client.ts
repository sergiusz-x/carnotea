import { createAuthClient } from 'better-auth/react';

// baseURL defaults to window.location.origin; basePath defaults to /api/auth.
// The Vite dev proxy forwards /api/* to http://localhost:3001.
export const authClient = createAuthClient();
