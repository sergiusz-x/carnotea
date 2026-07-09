import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  bumpSemver,
  classifyCommit,
  classifyCommits,
  computeBuildInfo,
  formatBuildIdentifier,
  formatSemver,
  formatTimestampBuildId,
  parseSemver,
} from './build-version';

describe('build-version', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

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

  it('formats a timestamp-based build id when commit sha is unavailable', () => {
    expect(formatTimestampBuildId('2026-07-09T20:17:58.655Z')).toBe('ts20260709t201758z');
    expect(formatBuildIdentifier(null, '2026-07-09T20:17:58.655Z')).toBe('ts20260709t201758z');
  });

  it('prefers the short commit sha when it is available', () => {
    expect(formatBuildIdentifier('abcdef1234567890', '2026-07-09T20:17:58.655Z')).toBe('abcdef1');
  });

  it('falls back to GitHub release metadata when git metadata is unavailable', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'carnotea-build-info-'));

    vi.stubEnv('SOURCE_COMMIT', '');
    vi.stubEnv('COMMIT_SHA', '');
    vi.stubEnv('GITHUB_SHA', '');
    vi.stubEnv('CI_COMMIT_SHA', '');
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '');
    vi.stubEnv('RAILWAY_GIT_COMMIT_SHA', '');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ tag_name: 'v1.0.1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    try {
      await expect(
        computeBuildInfo({
          builtAt: '2026-07-09T20:17:58.655Z',
          cwd: tempDir,
          repository: 'sergiusz-x/carnotea',
        }),
      ).resolves.toMatchObject({
        source: 'github-release',
        releaseVersion: 'v1.0.1',
        predictedReleaseVersion: 'v1.0.1',
        displayVersion: 'v1.0.1+build.ts20260709t201758z',
      });
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});
