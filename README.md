# AI App Generator — Track A (Full Stack)

A metadata-driven application runtime: a JSON config compiles into a real,
authenticated, database-backed application with its own UI, CRUD API, and
automation rules.

## Architecture

```
JSON config ──► zod schema (AppConfigSchema) ──► two outputs, opt-in linked
                                                   │
                ┌──────────────────────────────────┴───────────────────────┐
                ▼                                                          ▼
   UI rendering engine (sections/components)            Data engine (dataSchema)
   - ComponentRegistry: type → React component           - buildRecordSchema(): generates
   - Unknown component types render a safe fallback        a zod object schema on the fly
     instead of crashing (RegistryRenderer)                from declared fields
   - RuntimeErrorBoundary wraps every component so a      - AppRecord table stores rows as
     single bad widget can't crash the page                 JSON, validated against that
   - FormContext: a section with ≥1 field-mapped            dynamic schema on every write
     component becomes a controlled form whose BUTTON     - Workflows (declarative NOTIFY /
     POSTs to the same /records endpoint as the              WEBHOOK rules) run on record
     dataSchema-driven table (AppRuntime.tsx)                create/update/delete
   - RecordsContext: STAT/STAT_CARD with a `computed`
     prop reads real record counts instead of a
     static props.value (ComponentRegistry.tsx)
```

**Architectural note (read this before the review):** `sections`/
`ComponentRegistry` and `dataSchema` are still two separate engines — a
config author can build a section with zero field-mapped components (pure
display: cards, badges, dividers) and it stays purely presentational, as
before. But any section containing field-mapped components (`field` set on
`INPUT`/`SELECT`/`TEXTAREA`/`CHECKBOX`/`DATE`) is now a *real* form: those
components become controlled inputs bound to local state via `FormContext`,
and a `BUTTON` in the same section submits that state to
`POST /api/apps/[id]/records` — the exact same dynamic-schema validation
path `DataTable.tsx` uses, including required-field and type-coercion
errors surfaced inline by the button. Symmetrically, `STAT`/`STAT_CARD`
components can opt into a `props.computed` spec (`{ field, equals,
notEquals, in, notIn }`, no `field` = total count) to render a live
aggregate over `AppRuntime`'s already-fetched records instead of a static
number — useful for "Total / Completed / Open"-style overview panels that
should track real data. Both are opt-in per component: omit `field` on
inputs or `computed` on stat cards and you get the original inert demo
behavior. So: "does the form in the JSON config actually save data" is now
"yes, if its components declare a `field`" rather than a flat no.

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

## Extra features implemented (3 of 7 required, + 1 runtime enhancement)

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
4. **Live UI Preview ↔ Live Data binding** — field-mapped components in a
   preview section (`AppRuntime.tsx` `FormSectionProvider` +
   `ComponentRegistry.tsx` `FormContext`) write real records through the same
   endpoint and validation as the Live Data tab, and `STAT`/`STAT_CARD`
   components can render a live count via `props.computed` instead of a
   static value (`RecordsContext`). Both fall back to the original static
   demo rendering when not opted in, so existing configs are unaffected.

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