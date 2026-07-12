<h1><img src="public/logo.png" width="36" valign="middle" alt="Ordinat logo" /> Ordinat Dashboard</h1>

Dashboard for managing & displaying school psychotest sessions — schedule, per-subtest test links, and progress tracking. Everything requires login; there is no public side. Complements the `recap-fuzzy-score-matcher` (Flask) score-recap tool.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind v4 · Prisma · Supabase (Postgres + Auth) · Google Sheets/Drive (googleapis).

## Getting started

```bash
cp .env.example .env      # fill in Supabase project URL/keys + DB connection strings
npm install
npm run db:migrate        # create tables
npm run db:seed           # seed the 13 subtests
npm run dev                # http://localhost:3000
```

Then create the first admin account in **Supabase Studio > Authentication > Add user**, with the email field set to `{username}@ordinat.id` — login is username-based in the UI, but Supabase Auth is email-only under the hood. There's no signup flow in the app and no seed script for this step; any user in this Supabase project can sign in, and defaults to full admin access unless a role is set.

### Roles

Set via `app_metadata.role` on the Supabase user (Authentication > user > edit raw app metadata):

- **ADMIN** (default if unset) — full access.
- **PIC_LAPANGAN** — everything except link management and the recap tools.
- **TESTER** — only the Monitoring dashboard.

## Quick structure

- `/login` — the one route reachable while logged out.
- `/`, `/sekolah`, `/jadwal`, `/rekap`, `/automated-recap`, `/monitoring` — role-gated app pages.
- `recap-fuzzy-score-matcher` (separate sibling folder) — Flask recap engine, proxied through this app's own API routes; it has no UI of its own.

## Event status flow

`SCHEDULED → ONGOING → REKAP → DONE` (displayed in the UI in Indonesian as Terjadwal → Sedang Psikotes → Tahap Rekap → Tahap Resume). `SCHEDULED → ONGOING` advances automatically via a daily cron job (with a manual override button). `ONGOING → REKAP` is triggered from the Automated Recap page. `REKAP → DONE` is marked by the admin in the Rekap menu.

> **Note:** all end-user-facing UI copy (labels, buttons, messages) is written in Bahasa Indonesia.
