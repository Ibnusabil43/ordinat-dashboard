# Ordinat Dashboard

Dashboard for school psychotest sessions — schedule, per-subtest test links, and progress tracking. Public side is open; admin side requires login. Complements the `psikotes-automation` (Flask) score-recap tool.

- **PRD:** [docs/PRD.md](docs/PRD.md)
- **Coding & architecture guide:** [CLAUDE.md](CLAUDE.md)
- **Design spec:** [docs/DESIGN.md](docs/DESIGN.md)
- **Backlog:** [docs/STORIES_BACKEND.md](docs/STORIES_BACKEND.md) · [docs/STORIES_FRONTEND.md](docs/STORIES_FRONTEND.md)

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind v4 · Prisma · Supabase (Postgres + Auth).

## Getting started

```bash
cp .env.example .env      # fill in Supabase project URL/keys + DB connection strings
npm install
npm run db:migrate        # create tables
npm run db:seed           # seed the 12 subtests
npm run dev                # http://localhost:3000
```

Then create the first admin account in **Supabase Studio > Authentication > Add user** — there's no signup flow in the app and no seed script for it (any user in this Supabase project is treated as an admin; see CLAUDE.md > Auth model).

## Quick structure

- `/` and `/sekolah/[slug]` — public.
- `/admin/*` — admin (protected by middleware; login at `/admin/login`).
- `psikotes-automation` (separate sibling folder) — Flask recap tool, linked from `/admin/automated-recap`.

## Event status flow

`SCHEDULED → ONGOING → REKAP → DONE` (displayed in the UI in Indonesian as Terjadwal → Sedang Psikotes → Tahap Rekap → Tahap Resume). `ONGOING→REKAP` is triggered from the Flask tool; `REKAP→DONE` is marked by the admin in the Rekap menu. Details: [CLAUDE.md](CLAUDE.md).

> **Note:** all end-user-facing UI copy (labels, buttons, messages) must be written in Bahasa Indonesia — see CLAUDE.md. This documentation is in English for the benefit of whoever (human or model) is implementing the code.
