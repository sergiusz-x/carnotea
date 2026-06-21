#!/usr/bin/env node
// Ticket-spec linter. Proves every ticket is internally consistent and that
// tickets/INDEX.md mirrors the ticket frontmatter. Dependency-free (Node ESM).
//
// Two tiers of checks:
//   - Core   — run on every ticket. These invariants already hold repo-wide.
//   - Extended — run only on tickets that opt in with `spec_version` in their
//     frontmatter (the upgraded template). Lets the migration be gradual:
//     legacy and `done` historical tickets are never forced to backfill.
//
// Run: node scripts/lint-tickets.mjs   (or `pnpm lint:tickets`)

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ticketsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'tickets');

const STATUSES = ['backlog', 'ready', 'in_progress', 'blocked', 'in_review', 'done'];
const PRIORITIES = ['high', 'medium', 'low'];
const SIZES = ['S', 'M', 'L'];
const STATUS_TO_SECTION = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In progress',
  blocked: 'Blocked',
  in_review: 'In review',
  done: 'Done',
};
const CORE_SECTIONS = ['Goal', 'Context', 'Acceptance criteria'];
const EXTENDED_SECTIONS = ['Contract', 'Test matrix', 'Verification'];

const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

/** Minimal frontmatter reader — flat `key: value` lines between the first two `---`. */
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const fm = {};
  for (const line of text.slice(3, end).split('\n')) {
    const m = /^([a-z_]+):\s*(.*?)\s*$/.exec(line);
    if (m) fm[m[1]] = m[2].replace(/\s*#.*$/, '').trim();
  }
  return fm;
}

const sectionSet = (text) => new Set([...text.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]));

const ticketFiles = readdirSync(ticketsDir)
  .filter((f) => /^T-\d+.*\.md$/.test(f))
  .sort();

const seenIds = new Map();
const ticketsById = new Map();

for (const file of ticketFiles) {
  const text = readFileSync(join(ticketsDir, file), 'utf8');
  const fm = parseFrontmatter(text);
  if (!fm) {
    fail(file, 'missing or malformed frontmatter');
    continue;
  }

  const fileId = file.match(/^(T-\d+)/)[1];
  if (fm.id !== fileId) fail(file, `frontmatter id "${fm.id}" != filename id "${fileId}"`);
  if (seenIds.has(fileId)) fail(file, `duplicate id, also in ${seenIds.get(fileId)}`);
  seenIds.set(fileId, file);
  ticketsById.set(fileId, { file, fm, text });

  for (const key of ['id', 'title', 'status', 'priority', 'dependencies', 'created_at'])
    if (!(key in fm)) fail(file, `frontmatter missing "${key}"`);

  if (fm.status && !STATUSES.includes(fm.status))
    fail(file, `invalid status "${fm.status}" (allowed: ${STATUSES.join(', ')})`);
  if (fm.priority && !PRIORITIES.includes(fm.priority))
    fail(file, `invalid priority "${fm.priority}" (allowed: ${PRIORITIES.join(', ')})`);

  if (!new RegExp(`^#\\s+${fileId}\\b`, 'm').test(text))
    fail(file, `body is missing the "# ${fileId} — ..." heading`);

  const sections = sectionSet(text);
  for (const s of CORE_SECTIONS) if (!sections.has(s)) fail(file, `missing "## ${s}" section`);

  // Extended tier — opted in via spec_version.
  if ('spec_version' in fm) {
    if (!fm.size || !SIZES.includes(fm.size))
      fail(file, `spec_version set but size is missing/invalid (allowed: ${SIZES.join(', ')})`);
    for (const s of EXTENDED_SECTIONS)
      if (!sections.has(s)) fail(file, `spec_version set but missing "## ${s}" section`);
  }
}

// Dependencies must reference real tickets.
for (const { file, fm } of ticketsById.values()) {
  for (const dep of (fm.dependencies ?? '').match(/T-\d+/g) ?? [])
    if (!ticketsById.has(dep)) fail(file, `dependency ${dep} has no ticket file`);
}

// INDEX.md ↔ frontmatter consistency.
const indexPath = join(ticketsDir, 'INDEX.md');
const indexText = readFileSync(indexPath, 'utf8');
const indexEntries = new Map(); // id -> [sections]
let currentSection = null;
for (const line of indexText.split('\n')) {
  const h = /^##\s+(.+?)\s*$/.exec(line);
  if (h) {
    currentSection = h[1];
    continue;
  }
  const ref = /^\s*-\s+.*\[(T-\d+)\b/.exec(line);
  if (ref && currentSection) {
    if (!indexEntries.has(ref[1])) indexEntries.set(ref[1], []);
    indexEntries.get(ref[1]).push(currentSection);
  }
}

for (const [id, sections] of indexEntries) {
  if (!ticketsById.has(id)) fail('INDEX.md', `lists ${id} but no ticket file exists`);
  if (sections.length > 1)
    fail('INDEX.md', `${id} appears in multiple sections: ${sections.join(', ')}`);
}
for (const [id, { fm }] of ticketsById) {
  const want = STATUS_TO_SECTION[fm.status];
  const got = indexEntries.get(id);
  if (!got) fail('INDEX.md', `${id} (status ${fm.status}) is not listed`);
  else if (got[0] !== want)
    fail(
      'INDEX.md',
      `${id} is under "${got[0]}" but status is "${fm.status}" (expected "${want}")`,
    );
}

if (errors.length) {
  console.error(`✗ ticket lint: ${errors.length} problem(s)\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ ticket lint: ${ticketFiles.length} tickets OK`);
