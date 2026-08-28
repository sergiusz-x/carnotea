# CarNotea presentation assets

This directory contains committed assets used to show the real product in the root README and public landing page.

## Screenshot source

The canonical screenshots use the English interface in dark mode and controlled showcase data. They must never use production data or a personal account.

Generate them from the repository root after the local database and API are available:

```bash
pnpm --filter @carnotea/web showcase:capture
```

The command writes PNG images to `apps/web/public/showcase/`, the single canonical asset directory. The README links to that same directory; do not copy screenshots elsewhere.

## Asset rules

- Use a desktop viewport sized to the screen being shown and `390 × 844` for mobile captures. Preserve the whole viewport; do not crop it after capture.
- Use a dedicated `1200 × 630` viewport capture for the Open Graph preview.
- Force dark mode and wait for fonts and data before capture.
- Do not include devtools, loading skeletons, toasts, secrets, or PII.
- Keep each capture short enough to work as a product preview — never use a long full-page mobile screenshot.
- Capture the current dashboard, vehicle activity, analytics, and reminders across petrol and electric examples.
- Make every filename truthful: do not save the same application state under several feature names.
