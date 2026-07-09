import { describe, expect, it } from 'vitest';

import { deriveProfileNames } from './profile-name.js';

describe('deriveProfileNames', () => {
  it('keeps explicit non-empty names unchanged', () => {
    expect(
      deriveProfileNames({
        firstName: 'Jan',
        lastName: 'Kowalski',
        email: 'jan@example.com',
      }),
    ).toEqual({
      firstName: 'Jan',
      lastName: 'Kowalski',
    });
  });

  it('duplicates a single-word auth name into lastName', () => {
    expect(
      deriveProfileNames({
        name: 'Jan',
        email: 'jan@example.com',
      }),
    ).toEqual({
      firstName: 'Jan',
      lastName: 'Jan',
    });
  });

  it('falls back to email tokens when both stored names are blank', () => {
    expect(
      deriveProfileNames({
        firstName: ' ',
        lastName: '',
        email: 'jan.kowalski@example.com',
      }),
    ).toEqual({
      firstName: 'Jan',
      lastName: 'Kowalski',
    });
  });

  it('reuses the firstName when only lastName is blank', () => {
    expect(
      deriveProfileNames({
        firstName: 'Prince',
        lastName: '',
        email: 'prince@example.com',
      }),
    ).toEqual({
      firstName: 'Prince',
      lastName: 'Prince',
    });
  });
});
