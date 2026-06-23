# AI App Generator — Track A (Full Stack)

A metadata-driven application runtime: a JSON config compiles into a real,
authenticated, database-backed application with its own UI, CRUD API, and
automation rules.

## Architecture

```
JSON config ──► zod schema (AppConfigSchema) ──► two parallel outputs
                                                   │
                ┌──────────────────────────────────┴───────────────────────┐
                ▼                                                          ▼
   UI rendering engine (sections/components)            Data engine (dataSchema)
   - ComponentRegistry: type → React component           - buildRecordSchema(): generates
   - Unknown component types render a safe fallback        a zod object schema on the fly
     instead of crashing (RegistryRenderer)                from declared fields
   - RuntimeErrorBoundary wraps every component so a      - AppRecord table stores rows as
     single bad widget can't crash the page                 JSON, validated against that
                                                              dynamic schema on every write
                                                            - Workflows (declarative NOTIFY /
                                                              WEBHOOK rules) run on record
                                                              create/update/delete
```

**Important architectural note (read this before the review):** the two
outputs above are intentionally *not* the same form engine. `sections` /
`ComponentRegistry` is a presentational canvas — `INPUT`/`SELECT`/`CHECKBOX`/
etc. render with no `value`/`onChange` wiring back to any record, by design.
The actual functional create/edit/delete form is generated separately,
straight from `dataSchema`, inside `DataTable.tsx` (controlled inputs, real
submit handler, real validation). If asked "does the form in the JSON
config actually save data," the honest answer is: only the `dataSchema`
side does. Calling this out proactively rather than letting it look like an
unwired feature.

**Why JSON rows instead of generating real SQL tables per app?** Generating
and migrating a literal Postgres table per user-defined schema is the
"correct" long-term answer but is unsafe to do generically without a
sandboxed migration pipeline. Storing rows as `Json` on `AppRecord`, validated
through a schema built dynamically with `buildRecordSchema()`, gets the same
practical guarantees (typed validation, required fields, enums) without
running arbitrary DDL — a reasonable engineering trade-off for the scope of
this assignment, called out explicitly here for the architecture review.

**Resilience to malformed config**: `AppConfigSchema.safeParse` never throws.
Each entry in `sections`, `dataSchema`, and `workflows` is validated
*independently* (`lenientArray` in `types/schema.ts`) — a single section
missing required fields, a dataSchema entry without a `name`, or a workflow
with an invalid `trigger` is dropped on its own, with the rest of the config
still saving. (Earlier drafts validated these as plain `z.array(...)`, where
one bad entry anywhere rejected the *entire* config — fixed during review,
see `REVIEW_NOTES.md`.) Unknown component types render a labeled "blocked"
placeholder instead of crashing (`ComponentRegistry.tsx`), and
`RuntimeErrorBoundary` catches any render-time exception so one broken
section never takes the rest of the app down.

## Extra features implemented (3 of 7 required)

1. **CSV Import** — `/api/apps/[id]/import`. Parses with PapaParse, validates
   each row independently against the dynamic record schema; bad rows are
   skipped and reported (`rejected[]`) instead of failing the whole import.
2. **Notifications** — `Notification` model + `/api/notifications` +
   `NotificationBell` component (polls every 15s). Fired on app creation and
   by workflow `NOTIFY` actions.
3. **Workflow automation** — declarative rules in `config.workflows`
   (`ON_RECORD_CREATE` / `ON_RECORD_UPDATE` / `ON_RECORD_DELETE` →
   `NOTIFY` or `WEBHOOK`). Executed server-side in `lib/workflows.ts`; failures
   are swallowed so automation can never break the underlying CRUD call.

## Auth

NextAuth (Credentials provider, JWT sessions, bcrypt password hashing). Every
`CustomApp` row has an `ownerId`, and every API route checks session +
ownership before reading/writing it. `AppRecord` doesn't carry its own
`ownerId` column — it's scoped *indirectly*, by always looking up its parent
`CustomApp.ownerId` first (see `loadApp`/`loadOwnedAppAndRecord` in the
records routes) and 404'ing if it doesn't match the caller. Functionally
equivalent for this single-owner-per-app model, but worth being precise
about in review: it's "ownership via the parent," not a denormalized column
on every record. `middleware.ts` protects `/dashboard`, `/builder`, `/apps/*`
page routes.

## Setup

### Option A — Docker Compose (recommended, no Postgres install needed)

```bash
cp .env.example .env   
docker builder prune -af     # only NEXTAUTH_SECRET matters here, see file comments
docker compose up --build
```
OR

```bash
# Start only the database container
docker compose up db -d

# Then run the app locally
npm run dev
```
This spins up three containers:
- `postgres` — Postgres 16 with a persisted named volume (`postgres_data`), so
  data survives restarts
- `migrate` — a one-off job that runs `prisma migrate deploy` against that
  Postgres instance, then exits (the `app` container waits for it via
  `condition: service_completed_successfully`)
- `app` — the Next.js app itself, built from the `Dockerfile` using
  `output: "standalone"` for a lean production image

No local Postgres install, no manual `prisma migrate` step — `docker compose up`
is the whole setup. App is available at `http://localhost:3000`.

To reset the database entirely: `docker compose down -v` (drops the volume).

### Option B — Local Node, your own Postgres

```bash
cp .env.example .env       # fill in DATABASE_URL + NEXTAUTH_SECRET
npm install
npx prisma migrate dev --name init
npm run dev
```

Then visit `/register` → `/dashboard` → **New App** to paste/edit a JSON
config and generate a live app.

## Known trade-offs / what I'd do next with more time

- Per-app SQL table generation (instead of JSON rows) for large-scale data.
- Role-based sharing of generated apps between users (currently single-owner).
- GitHub export and a proper multi-provider auth (OAuth) were scoped out in
  favor of shipping CSV import / notifications / workflows cleanly — happy to
  walk through the trade-off in review.
