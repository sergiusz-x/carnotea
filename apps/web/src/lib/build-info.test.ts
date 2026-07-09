import { describe, expect, it } from 'vitest';

import { formatBuildInfoLabel, type BuildInfo } from './build-info';

describe('formatBuildInfoLabel', () => {
  it('returns the precomputed display version', () => {
    const info: BuildInfo = {
      builtAt: '2026-07-09T19:00:00.000Z',
      commitSha: 'abcdef1234567890',
      shortCommitSha: 'abcdef1',
      releaseType: 'patch',
      releaseVersion: 'v1.0.0',
      predictedReleaseVersion: 'v1.0.1',
      displayVersion: 'v1.0.1+build.abcdef1',
      source: 'git',
    };

    expect(formatBuildInfoLabel(info)).toBe('v1.0.1+build.abcdef1');
  });
});
