<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project: Forja (gym log PWA)

- Product spec, phases and every design decision: `docs/DECISIONES.md`. User-facing setup: `README.md` (Spanish, for a non-programmer).
- Local-first: UI reads/writes only the device DB (`src/data/local`, Dexie). All writes go through `saveRows` (row + outbox in one transaction); `src/data/sync` pushes/pulls Supabase. Never call Supabase from UI components.
- Session sets are written only through `src/data/repositories/sessions.ts`: it recomputes the cached `session_sets.is_pr` from the exercise's whole history. Sports are stored as codes (`src/domain/sports.ts`, `canonicalSport`), never as translated names; what each sport records (distance, `sessions.metrics` keys) comes from `sportProfile`. Columns added to an existing table also go in `COLUMN_DEFAULTS` (`src/data/sync/tables.ts`) and get a Dexie upgrade that fills them.
- Achievements are defined in code (`src/domain/achievements/catalog.ts`, texts in `achievements.items.<key>`); only unlocks are stored (`user_achievements`, id derived from user + key + tier). Any new place that finishes or saves a session calls `useAchievementCheck()`.
- Charts are our own SVG components (`src/components/charts`, no chart library): colours only from `--chart-1`/`--chart-2` (validated for colour blindness), values shown in a readout above the chart (not a floating tooltip), and a table view (`ChartTable`).
- Business logic lives in `src/domain` (pure TS, Vitest tests next to it). Row shapes in `src/domain/schemas.ts` must mirror `supabase/migrations`.
- Schema changes: new file in `supabase/migrations`, update `schemas.ts` + `src/data/sync/tables.ts` + Dexie version in `src/data/local/db.ts`, add pgTAP checks in `supabase/tests`.
- Every user-facing string goes in `src/i18n/messages/es.ts` and `en.ts` (same keys; a test enforces it). Weights are stored in kg.
- UI follows Apple's HIG (see "Diseño visual" in DECISIONES): build screens from `src/components/ui` (Card, Group rows, Drawer/vaul, ConfirmProvider, sonner toasts) and `src/components/motion` (springs come from `MotionConfig`; no CSS transform transitions). New theme scales (text sizes, shadows) must also be added to `cn`'s tailwind-merge config in `src/lib/utils.ts`.
- Checks: `npm run check` (lint, types, unit tests); `npm run test:db` with `npx supabase start` running.
