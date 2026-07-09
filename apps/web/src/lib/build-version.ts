import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import type { BuildInfo, ReleaseType } from './build-info';

const RELEASE_RANK: Record<ReleaseType, number> = {
  none: 0,
  patch: 1,
  minor: 2,
  major: 3,
};

const COMMIT_RELEASE_TYPE: Partial<Record<string, ReleaseType>> = {
  feat: 'minor',
  fix: 'patch',
  perf: 'patch',
  revert: 'patch',
};

interface Semver {
  major: number;
  minor: number;
  patch: number;
}

export function parseSemver(tag: string): Semver | null {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(tag);
  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function formatSemver(version: Semver): string {
  return `v${String(version.major)}.${String(version.minor)}.${String(version.patch)}`;
}

export function bumpSemver(version: Semver, releaseType: ReleaseType): Semver {
  if (releaseType === 'major') {
    return {
      major: version.major + 1,
      minor: 0,
      patch: 0,
    };
  }

  if (releaseType === 'minor') {
    return {
      major: version.major,
      minor: version.minor + 1,
      patch: 0,
    };
  }

  if (releaseType === 'patch') {
    return {
      major: version.major,
      minor: version.minor,
      patch: version.patch + 1,
    };
  }

  return version;
}

export function classifyCommit(message: string): ReleaseType {
  const normalized = message.trim();
  const header = normalized.split('\n')[0] ?? '';

  if (/BREAKING CHANGE:/m.test(normalized)) {
    return 'major';
  }

  const match = /^(?<type>[a-z]+)(?:\([^)]+\))?(?<breaking>!)?:\s.+$/.exec(header);
  if (!match?.groups) {
    return 'none';
  }

  if (match.groups.breaking === '!') {
    return 'major';
  }

  const commitType = match.groups.type;
  return commitType ? (COMMIT_RELEASE_TYPE[commitType] ?? 'none') : 'none';
}

export function classifyCommits(messages: string[]): ReleaseType {
  return messages.reduce<ReleaseType>((highest, message) => {
    const releaseType = classifyCommit(message);
    return RELEASE_RANK[releaseType] > RELEASE_RANK[highest] ? releaseType : highest;
  }, 'none');
}

function runGit(args: string[], cwd: string): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function getRepoRoot(cwd: string): string {
  return runGit(['rev-parse', '--show-toplevel'], cwd);
}

function getLatestReleaseTag(cwd: string): string | null {
  try {
    return runGit(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*.[0-9]*.[0-9]*'], cwd);
  } catch {
    return null;
  }
}

function getCommitMessagesSinceTag(cwd: string, tag: string | null): string[] {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  const output = runGit(['log', '--format=%B%x00', range], cwd);

  return output
    .split('\0')
    .map((message) => message.trim())
    .filter(Boolean);
}

function getCurrentCommitSha(cwd: string): string {
  return runGit(['rev-parse', 'HEAD'], cwd);
}

function computeNextReleaseVersion(latestTag: string | null, releaseType: ReleaseType): string {
  if (!latestTag) {
    return releaseType === 'none' ? 'v0.0.0' : 'v1.0.0';
  }

  if (releaseType === 'none') {
    return latestTag;
  }

  const parsed = parseSemver(latestTag);
  if (!parsed) {
    return latestTag;
  }

  return formatSemver(bumpSemver(parsed, releaseType));
}

export function computeBuildInfo(options?: { cwd?: string; builtAt?: string }): BuildInfo {
  const cwd = options?.cwd ?? resolve(import.meta.dirname, '..');
  const builtAt = options?.builtAt ?? new Date().toISOString();

  try {
    const repoRoot = getRepoRoot(cwd);
    const latestReleaseTag = getLatestReleaseTag(repoRoot);
    const commitMessages = getCommitMessagesSinceTag(repoRoot, latestReleaseTag);
    const releaseType = classifyCommits(commitMessages);
    const predictedReleaseVersion = computeNextReleaseVersion(latestReleaseTag, releaseType);
    const commitSha = getCurrentCommitSha(repoRoot);
    const shortCommitSha = commitSha.slice(0, 7);

    return {
      builtAt,
      commitSha,
      shortCommitSha,
      releaseType,
      releaseVersion: latestReleaseTag,
      predictedReleaseVersion,
      displayVersion: `${predictedReleaseVersion}+build.${shortCommitSha}`,
      source: 'git',
    };
  } catch {
    return {
      builtAt,
      commitSha: 'unknown',
      shortCommitSha: 'unknown',
      releaseType: 'none',
      releaseVersion: null,
      predictedReleaseVersion: 'v0.0.0',
      displayVersion: 'v0.0.0+build.unknown',
      source: 'fallback',
    };
  }
}
