// SemVer releases from conventional commits — see docs/release-process.md.
// Tag-only: no CHANGELOG.md commit, no package.json version bump, so this
// never has to push to `main` (git tags aren't subject to branch protection).
export default {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/github',
  ],
};
