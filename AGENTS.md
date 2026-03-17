# Ukespeil — AGENTS.md

Single source of truth for Codex and all AI-assisted development on this project.
Read this file at the start of every session before writing any code.

---

## Project overview

**Ukespeil** is an internal team tool for weekly time reflection.
Team members log how they *planned* to spend their week (Monday) and how they *actually* spent it (Friday).
The goal is portfolio visibility — not billing. Registration must take under 30 seconds.

Core mechanic: plan vs. actual comparison with an accuracy score and streak gamification.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Language | TypeScript |
| Database | Neon (serverless Postgres) |
| API | Netlify Functions (`netlify/functions/*.ts`) |
| DB client | `postgres` npm package (no ORM) |
| Charts | Recharts |
| Deploy | Netlify |
| Confetti | `canvas-confetti` |

---

## Project structure

```
ukespeil/
├── AGENTS.md                  ← this file
├── .env.local                 ← DATABASE_URL, API_SECRET (never commit)
├── .env.example               ← committed, no real secrets
├── netlify.toml
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types.ts               ← shared TypeScript types
│   ├── lib/
│   │   ├── api.ts             ← all fetch calls to Netlify functions
│   │   ├── utils.ts           ← weekStart(), accuracyScore(), sortProjects()
│   │   └── constants.ts
│   ├── hooks/
│   │   ├── useCurrentUser.ts  ← reads/writes localStorage
│   │   ├── useWeekEntry.ts    ← fetches plan+actual for a given week
│   │   └── useProjects.ts     ← fetches active projects
│   └── components/
│       ├── UserSelect.tsx
│       ├── WeekView.tsx
│       ├── WeekNav.tsx
│       ├── ProjectSelector.tsx
│       ├── ProjectRow.tsx
│       ├── EntryForm.tsx
│       ├── AllocationSlider.tsx
│       ├── TotalIndicator.tsx
│       ├── SubmitButton.tsx
│       ├── AccuracyCard.tsx
│       ├── Dashboard.tsx
│       ├── StreakBadge.tsx
│       ├── TeamWeekChart.tsx
│       ├── ProjectTrendChart.tsx
│       ├── InsightPanel.tsx
│       └── ProjectAdmin/
│           ├── index.tsx
│           ├── ProjectList.tsx
│           ├── AddProjectModal.tsx
│           └── EditProjectModal.tsx
└── netlify/
    └── functions/
        ├── _db.ts             ← shared Neon client
        ├── health.ts          ← GET /.netlify/functions/health
        ├── users.ts           ← GET/POST /.netlify/functions/users
        ├── projects.ts        ← GET/POST/PATCH /.netlify/functions/projects
        ├── entries.ts         ← GET/POST /.netlify/functions/entries
        └── dashboard.ts       ← GET /.netlify/functions/dashboard
```

---

## Database schema

Run this SQL in the Neon console to set up the database.

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6366F1',
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE week_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  week_start   DATE NOT NULL,            -- always a Monday, e.g. 2025-03-17
  type         TEXT NOT NULL,            -- 'plan' or 'actual'
  allocations  JSONB NOT NULL,           -- { "<project_uuid>": 40, "<project_uuid>": 60 }
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT week_entries_unique UNIQUE (user_id, week_start, type)
);
```

---

## Data model notes

- `week_start` is always the **ISO Monday** of the week (`YYYY-MM-DD`).
  Use `weekStart(date)` from `src/lib/utils.ts` — never compute this inline.
- `allocations` JSONB contains **only selected projects** (projects with 0% are omitted).
  Values are integers that sum to 100.
- There is exactly one `'plan'` and one `'actual'` row per user per week.
  Updating replaces the row (upsert on the unique constraint).

---

## API routes

All routes live in `netlify/functions/*.ts` (Netlify Functions).
Protected write routes require header `x-api-secret: <API_SECRET>` — set this env var in Netlify.

| Method | Route | Description |
|---|---|---|
| GET | `/.netlify/functions/users` | List all users |
| POST | `/.netlify/functions/users` | Create user `{ name }` |
| GET | `/.netlify/functions/projects` | List active projects |
| POST | `/.netlify/functions/projects` | Create project `{ name, color }` |
| PATCH | `/.netlify/functions/projects?id=<id>` | Update project `{ name?, color?, active? }` |
| GET | `/.netlify/functions/entries?userId=&weekStart=` | Get plan+actual for a user+week |
| POST | `/.netlify/functions/entries` | Upsert entry `{ userId, weekStart, type, allocations }` |

---

## Key business logic

### weekStart(date)
Returns the Monday of the week containing `date` as `YYYY-MM-DD`.

```ts
export function weekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}
```

### accuracyScore(plan, actual)
Returns 0–100. Both arguments are `Record<string, number>` (allocations objects).
Formula: `100 - (sum of absolute differences across all projects) / 2`

```ts
export function accuracyScore(
  plan: Record<string, number>,
  actual: Record<string, number>
): number {
  const allKeys = new Set([...Object.keys(plan), ...Object.keys(actual)]);
  let totalDiff = 0;
  for (const key of allKeys) {
    totalDiff += Math.abs((plan[key] ?? 0) - (actual[key] ?? 0));
  }
  return Math.round(100 - totalDiff / 2);
}
```

### sortProjects(projects, history)
Sorts projects for display in ProjectSelector, per user:
1. Used last week (pre-selected)
2. Used ≥ 3 of last 5 weeks (frequent)
3. Alphabetical (rest)

`history` is the last 5 `week_entries` of type `'actual'` for the current user.

---

## Auth / identity (v1)

No login. Identity is stored in `localStorage` as `{ id, name }` after the user picks their name from the list on first visit.

All API write calls include `userId` in the request body.
The `API_SECRET` header protects mutations from anonymous abuse — it is hardcoded in `src/lib/api.ts` from `import.meta.env.VITE_API_SECRET`.

**Do not implement real auth in v1.** Leave a `// TODO: replace with Clerk in v2` comment where relevant.

---

## Environment variables

```
# .env.local (never committed)
DATABASE_URL=postgres://...          # Neon connection string (pooled)
API_SECRET=some-random-string

# .env.example (committed)
DATABASE_URL=
API_SECRET=
```

Vite exposes `VITE_*` vars to the frontend. Backend-only vars (no `VITE_` prefix) are only available in `/api` functions.

```
VITE_API_SECRET=same-value-as-API_SECRET
```

---

## Coding conventions

- **TypeScript everywhere.** No `any`. Define all shared types in `src/types.ts`.
- **No ORM.** Use the `postgres` package directly. Keep queries in the Netlify function files.
- **No inline styles.** Use Tailwind utility classes only.
- **Error handling.** Every API route must return a JSON error with a meaningful message on failure. Every `fetch` call in `api.ts` must throw on non-2xx.
- **Rounding.** All percentages displayed in the UI must be rounded integers. Never show floats.
- **weekStart always Monday.** Never derive week boundaries inline — always use the `weekStart()` util.
- **Upsert, don't insert.** Entries use `INSERT ... ON CONFLICT DO UPDATE` — never assume a row doesn't exist.
- **Component size.** If a component exceeds ~150 lines, split it.

---

## What NOT to build in v1

- No authentication / login flow (localStorage only)
- No email or push notifications
- No CSV/PDF export
- No comment fields on entries
- No admin password UI (API_SECRET is sufficient)

Add a `// v2` comment if you find yourself starting to implement these.

---

## Local dev setup

```bash
# 1. Install deps
npm install

# 2. Copy env
cp .env.example .env.local
# → fill in DATABASE_URL from Neon dashboard and choose an API_SECRET

# 3. Run migrations (paste schema SQL in Neon console — no migration runner in v1)

# 4. Start dev server
npm run dev
```

Netlify CLI is optional but useful: `npx netlify dev` runs both Vite and the Netlify functions locally.

---

## Netlify deployment

- Connect the GitHub repo to Netlify.
- Set `DATABASE_URL`, `API_SECRET`, and `VITE_API_SECRET` as environment variables in the Netlify dashboard.
- Build command: `npm run build` / Publish directory: `dist`.
- Functions directory: `netlify/functions` (configured in `netlify.toml`).

---

*Last updated: project kickoff. Update this file when the data model, routes, or stack changes.*
