# ReadUpBackend

The API, database, and book-search engine for **ReadUp**. Express + Prisma +
PostgreSQL (production database on Supabase), TypeScript. The iOS app
(`../ReadUp` on disk relative to this repository) is the only client.

## Layout

```
src/
  routes/         Endpoint definitions per resource, mounted in server.ts.
  controllers/    Receives the HTTP request, calls a service, maps thrown errors
                  to a status code, sends the response. No business logic here.
  services/       Business logic: validation, orchestration across repositories,
                  the Open Library / Google Books search engine (services/search/).
  repositories/   The only layer that talks to Prisma directly.
  dtos/           Interfaces for what comes in and what goes out of each layer.
  middlewares/    auth.middleware.ts — verifies the JWT, sets req.userId.
  database/       Prisma client singleton.
  infos/          Project notes for humans/AI picking this up — see
                  CONTEXTO_PROJETO.md (Portuguese; pre-existing, not migrated to
                  English — see the note at the bottom of this file).
prisma/           schema.prisma and migrations/.
```

A request flows `routes → middlewares (if any) → controller → service →
repository → Prisma`. Controllers exist only to unwrap the request and map errors
to status codes — see `reading-session.controller.ts`'s `create` for the pattern:
`error.message === 'Book not found' ? 404 : error.message === 'Access denied' ? 403
: 400`. Validation and orchestration belong in the service, not the controller.

## Public vs. authenticated routes

Most resources are entirely behind `authMiddleware`, applied with
`router.use(authMiddleware)` partway down the route file — everything registered
above that line is public, everything below requires a valid JWT. `book.routes.ts`
is the one route file that splits this way on purpose:

```ts
bookRoutes.get('/search', bookController.search);   // public — guests can search
bookRoutes.get('/lookup', bookController.lookup);    // public — ISBN scanner, no account
bookRoutes.get('/:id/cover', bookController.getCover); // public — cover images
bookRoutes.use(authMiddleware);
bookRoutes.post('/', ...); bookRoutes.get('/', ...); // everything else: a user's own library
```

The ordering matters twice: these three routes have to be registered *before*
`bookRoutes.use(authMiddleware)`, and `/search`/`/lookup` have to come before
`/:id/cover` — a plain `/:id` pattern would otherwise swallow them. `auth.routes.ts`
and `user.routes.ts` have their own public slices (registration, login, password
reset) for the same reason: an account doesn't exist yet at the point those run.

## Prisma migration policy

`DATABASE_URL` points at a **production** Supabase database — there is no separate
staging database. Schema changes always go:

1. `prisma migrate dev --create-only` to generate the migration SQL without
   applying it.
2. Read the generated SQL by hand before doing anything else.
3. `prisma migrate deploy` to apply it.

Never `prisma migrate dev` without `--create-only` (it applies immediately), and
never `prisma migrate reset` or `prisma db push` — both bypass the migration
history against a database with real user data in it.

## Tests

`npm test` runs `tsc && node --test`: TypeScript compiles to `dist/`, then node's
built-in test runner (`node:test`/`node:assert`) executes every `*.test.js` it
finds there. No test framework dependency — this project intentionally doesn't pull
in Jest/Vitest/Mocha for what a handful of `test()`/`assert` calls already cover.

Coverage is not broad. As of this writing it's `src/services/search/` (Open Library
provider, language/MARC mapping, the TTL cache, and the book-search service that
composes them) plus `src/services/reading-session.service.test.ts`, which covers
`validateCreateSessionInput` — the input validation added when the iOS client
gained an offline replay path and could resend a queued session's `pagesRead`,
`readingTimeSeconds`, and `date` without a live user driving the UI. Everything
else — auth, users, books outside search, the controllers, the repositories — has
no automated test. Write a new `*.service.test.ts` alongside the service it tests,
following the existing files' plain node:test style, rather than introducing a
framework or a fixtures/mocks layer for a codebase this size.

## Deploy

Zero-config Express on Vercel, run as a serverless function
(`if (!process.env.VERCEL) app.listen(...)` in `server.ts` — Vercel invokes the
exported `app` directly and never calls `listen`). `app.set('trust proxy', true)`
matters because Vercel (like Render before it)
terminates TLS and forwards `X-Forwarded-Proto`; without it, `req.protocol` always
reports `http` and any URL the backend generates from it (book cover URLs) breaks
in production.

## Working conventions

- Code comments: Portuguese, matching the existing codebase.
- `.md` files in this repository, going forward, are written in **English** —
  matching `ReadUp/CLAUDE.md`'s project-wide rule. The one exception is
  `src/infos/CONTEXTO_PROJETO.md`, a pre-existing Portuguese file kept in Portuguese
  rather than translated wholesale as a side effect of an unrelated change; a
  future pass that actually rewrites its content is free to reconsider that.
- This file exists because `ReadUp/CLAUDE.md` says it does ("`ReadUpBackend` ...
  keeps its own `CLAUDE.md`") — it didn't until now. There is no `.claude/`
  directory here yet (`specs/`/`plans/`/`handoff/`); work spanning both
  repositories is recorded in `ReadUp/.claude/handoff/`, referencing this
  repository's commit by short SHA once one exists for the change in question.
