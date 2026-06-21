#!/usr/bin/env node
// Regenerates the list region of tickets/INDEX.md from each ticket's frontmatter.
//
// Why: INDEX.md used to be hand-edited, so every PR that moved a ticket between
// sections touched the same lines and merge-conflicted. The status already lives
// in each ticket's frontmatter (one file per ticket — no shared-line conflicts),
// so that is the single source of truth and this script renders the view.
//
// Workflow: change a ticket's `status` in its file, then run `pnpm tickets:index`.
// Only the region between the BEGIN/END markers is rewritten; the intro and the
// Conventions footer are preserved. `tickets/INDEX.md merge=union` (.gitattributes)
// keeps concurrent regenerations from hard-conflicting; `lint-tickets.mjs` catches
// any inconsistency a messy merge leaves behind, which a re-run of this fixes.
//
// Dependency-free Node ESM. Run: node scripts/gen-tickets-index.mjs

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ticketsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'tickets');
const indexPath = join(ticketsDir, 'INDEX.md');

const BEGIN =
  '<!-- BEGIN GENERATED:tickets — edit ticket frontmatter, then run `pnpm tickets:index` -->';
const END = '<!-- END GENERATED:tickets -->';

const EMOJI = { high: '🔴', medium: '🟡', low: '🟢' };
// [status, heading, intro note (or '')], rendered in this order.
const SECTIONS = [
  [
    'ready',
    'Ready',
    'These tickets are fully specced. An agent picks the first one whose `dependencies`\nare all `done` — use `/next-ticket` (Claude Code) or the `next-ticket` skill (Codex).',
  ],
  ['backlog', 'Backlog', ''],
  ['in_progress', 'In progress', ''],
  ['blocked', 'Blocked', ''],
  ['in_review', 'In review', ''],
  ['done', 'Done', ''],
];

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

const tickets = [];
for (const file of readdirSync(ticketsDir)) {
  if (!/^T-\d+.*\.md$/.test(file)) continue;
  const fm = parseFrontmatter(readFileSync(join(ticketsDir, file), 'utf8'));
  if (!fm) continue;
  tickets.push({ id: fm.id, num: Number(fm.id.slice(2)), file, fm });
}
tickets.sort((a, b) => a.num - b.num);

const line = (t) => `- ${EMOJI[t.fm.priority] ?? '⚪'} [${t.id} — ${t.fm.title}](./${t.file})`;

const body = SECTIONS.map(([status, heading, note]) => {
  const rows = tickets.filter((t) => t.fm.status === status);
  const list = rows.length ? rows.map(line).join('\n') : '_None._';
  return `## ${heading}\n\n${note ? `${note}\n\n` : ''}${list}`;
}).join('\n\n');

const current = readFileSync(indexPath, 'utf8');
const beginIdx = current.indexOf(BEGIN);
const endIdx = current.indexOf(END);
if (beginIdx === -1 || endIdx === -1) {
  console.error(`✗ INDEX.md is missing the generation markers:\n  ${BEGIN}\n  ${END}`);
  process.exit(1);
}

const head = current.slice(0, beginIdx + BEGIN.length);
const tail = current.slice(endIdx);
const next = `${head}\n\n${body}\n\n${tail}`;

if (next === current) {
  console.log('✓ tickets index already up to date');
} else {
  writeFileSync(indexPath, next);
  console.log(`✓ tickets index regenerated (${tickets.length} tickets)`);
}
