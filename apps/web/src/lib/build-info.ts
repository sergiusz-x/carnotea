export type ReleaseType = 'none' | 'patch' | 'minor' | 'major';
export type BuildInfoSource = 'git' | 'github-release' | 'fallback';

export interface BuildInfo {
  builtAt: string;
  commitSha: string;
  shortCommitSha: string;
  releaseType: ReleaseType;
  releaseVersion: string | null;
  predictedReleaseVersion: string;
  displayVersion: string;
  source: BuildInfoSource;
}

const fallbackBuildInfo: BuildInfo = {
  builtAt: '',
  commitSha: 'unknown',
  shortCommitSha: 'unknown',
  releaseType: 'none',
  releaseVersion: null,
  predictedReleaseVersion: 'v0.0.0',
  displayVersion: 'v0.0.0+build.unknown',
  source: 'fallback',
};

const injectedBuildInfo =
  typeof __APP_BUILD_INFO__ !== 'undefined' ? __APP_BUILD_INFO__ : undefined;

export const buildInfo = injectedBuildInfo ?? fallbackBuildInfo;

export function formatBuildInfoLabel(info: BuildInfo = buildInfo) {
  return info.displayVersion;
}
