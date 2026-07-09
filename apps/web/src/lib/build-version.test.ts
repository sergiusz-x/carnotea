import { describe, expect, it } from 'vitest';

import {
  bumpSemver,
  classifyCommit,
  classifyCommits,
  formatSemver,
  parseSemver,
} from './build-version';

describe('build-version', () => {
  it('parses and formats release tags', () => {
    expect(parseSemver('v1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(formatSemver({ major: 2, minor: 0, patch: 1 })).toBe('v2.0.1');
  });

  it('bumps versions by semantic-release category', () => {
    expect(bumpSemver({ major: 1, minor: 2, patch: 3 }, 'patch')).toEqual({
      major: 1,
      minor: 2,
      patch: 4,
    });
    expect(bumpSemver({ major: 1, minor: 2, patch: 3 }, 'minor')).toEqual({
      major: 1,
      minor: 3,
      patch: 0,
    });
    expect(bumpSemver({ major: 1, minor: 2, patch: 3 }, 'major')).toEqual({
      major: 2,
      minor: 0,
      patch: 0,
    });
  });

  it('classifies individual commit messages', () => {
    expect(classifyCommit('fix(api): correct profile names')).toBe('patch');
    expect(classifyCommit('feat(web): add build badge')).toBe('minor');
    expect(classifyCommit('feat(web)!: change route contract')).toBe('major');
    expect(classifyCommit('docs(repo): update readme')).toBe('none');
    expect(
      classifyCommit(
        'fix(api): change profile payload\n\nBREAKING CHANGE: clients must send locale',
      ),
    ).toBe('major');
  });

  it('picks the highest release bump across commits', () => {
    expect(
      classifyCommits([
        'docs(repo): update docs',
        'fix(api): correct payload',
        'feat(web): expose build info',
      ]),
    ).toBe('minor');
  });
});
