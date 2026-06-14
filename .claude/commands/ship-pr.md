---
description: Validate, push the current branch, and open a PR on GitHub
---

> **Context check:** `AGENTS.md` is auto-loaded — its **Never / Always** rules apply.
> In particular: never push `main`; never skip validation; never commit secrets.

Push the current branch and open a pull request on GitHub.

1. Confirm the current branch is NOT `main`. If it is, stop and warn the user.
2. Run the full validation suite — do not push a failing branch:
   ```
   pnpm lint && pnpm typecheck && pnpm test
   ```
   If anything fails, stop and show the output.
3. Identify the linked ticket from the branch name (`feat/T-NNN-*` → `T-NNN`).
   Read the ticket file to get the title, goal, and any unverified items from
   the Notes section.
4. Push: `git push -u origin <branch>`.
5. Create the PR with `gh pr create`. Follow `.github/PULL_REQUEST_TEMPLATE.md`
   for the body structure:
   - Title: `<type>(<scope>): <ticket title>`  (same pattern as the branch type)
   - Body must include: link to ticket, what changed, how verified, anything
     *not* verified and why.
6. After the PR is created:
   - Update the ticket frontmatter: `status: in_review`, `updated_at: <today>`.
   - Move its line in `tickets/INDEX.md` from In progress to **In review**.
   - Commit these updates: `chore(tickets): T-NNN → in_review`.
   - Push the commit to the same branch.
7. Output the PR URL.
