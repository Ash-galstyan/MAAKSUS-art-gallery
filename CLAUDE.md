# CLAUDE.md

Working notes for AI assistants on this repo. `README.md` covers setup, migrations
and deployment — don't duplicate it here. This file covers **conventions and
gotchas** that aren't obvious from reading a single file.

## What this is

Full-stack art gallery + print store for the Armenian market. Angular 18.2 SPA,
Express 4 / Prisma 5 / PostgreSQL API, Ameriabank vPOS payments, trilingual
EN/HY/RU throughout (UI strings *and* database content).

```
art-gallery/
├── backend/    # Express + Prisma API
├── frontend/   # Angular SPA
├── uploads/    # image storage (gitignored)
└── docker-compose.yml
```

Development happens on **Windows**. Paths in README that assume nvm/bash are
Linux-oriented; adapt rather than follow literally.

## Commands

```bash
# backend/
npm run dev            # tsx watch src/server.ts → :3000
npm run typecheck      # tsc --noEmit — run this before declaring done
npm run prisma:migrate # migrate dev
npm run prisma:studio
npm run seed

# frontend/
npm start              # ng serve with proxy.conf.json → :4200
npm run build
```

There is no test suite. `npm run typecheck` plus a manual pass is the bar.

---

## Frontend conventions

**Modern Angular only.** Standalone components everywhere — there are no
NgModules in this codebase and none should be added. Use:

- `inject()`, never constructor parameter injection
- `signal()` / `computed()` for state, never `BehaviorSubject` for component or service state
- new control flow (`@if`, `@for`, `@switch`), never `*ngIf` / `*ngFor`
- `input()` / `output()` functions over the `@Input()` / `@Output()` decorators

**Service state lives in signals, exposed read-only.** The pattern throughout
`core/`: a private `_thing = signal(...)`, a public
`readonly thing = this._thing.asReadonly()`, and `computed()` for anything
derived. See `core/cart/cart.service.ts` for the reference implementation.

**`ApiService` is promise-based, not observable-based.** `core/http/api.service.ts`
wraps `HttpClient`, `firstValueFrom`s it, and unwraps the backend's `{ data }`
envelope. Feature services `await` it and work with raw `T`. Don't return
observables from feature services.

**Envelope exception — the cart endpoints.** `GET /cart` and `POST /cart/sync`
return the full `CartPayload` *directly*, not wrapped in `{ data }`. `CartService`
therefore bypasses `ApiService` and uses `HttpClient` directly for those two
calls. Don't "fix" this by routing them through `ApiService` without also
changing `cart.controller.ts`.

**i18n.** `I18nService.t('dot.path.key')` with `{{param}}` interpolation. Bundles
live in `src/assets/i18n/{en,hy,ru}.json` and load lazily per language. Missing
keys return the key itself, so a raw dot-path visible in the UI means a missing
translation. **Any new user-facing string needs all three files updated** — an
en-only key silently degrades for HY/RU users.

Backend locale codes are uppercase (`EN`/`HY`/`RU`); the frontend uses lowercase.
`I18nService.localeServer()` does the mapping — use it rather than
`.toUpperCase()` at call sites.

**Effects that write signals need `{ allowSignalWrites: true }`** on Angular 18.
Writing a signal inside an `effect()` without it throws at runtime, not at
compile time. This has bitten this project before. Better still, prefer
`computed()` and only reach for an effect when synchronising with something
outside the signal graph.

**Shared pipes** — `upload-url.pipe.ts` builds image URLs, `price.pipe.ts`
formats AMD. Use them instead of interpolating paths or formatting currency
inline.

---

## Backend conventions

**Every domain module is a quad** under `src/modules/<name>/`:

```
<name>.routes.ts      # express.Router, wires middleware
<name>.controller.ts  # req/res only — no business logic
<name>.service.ts     # business logic + Prisma, no req/res
<name>.schemas.ts     # zod schemas used by the validate middleware
```

Keep the layering strict: controllers don't touch Prisma, services don't touch
`req`/`res`.

**Middleware helpers** in `src/middleware/`: `validate` (zod), `auth` (JWT),
`role` (RBAC), `locale` (sets `req.locale`), `rate-limit`, `error-handler`.
Wrap async handlers in `asyncHandler` from `lib/async-handler.ts` and throw
`HttpError` from `lib/http-error.ts` — don't `res.status(...).json(...)` errors
by hand.

**Middleware order in `app.ts` is load-bearing** and documented at the top of
that file. `trust proxy` must precede rate limiting; the error handler must be
last.

**Response shapes.** `{ data: T }` for single records and simple lists,
`{ data: T[], nextCursor }` for cursor-paginated lists. Pagination is cursor-based,
not offset-based.

**Translations.** Every translatable model has a sibling `*Translation` table
(`Artwork`/`ArtworkTranslation`, etc.). Always read them through
`pickTranslation()` in `lib/i18n-select.ts`, which falls back locale → EN →
first available. Never index translations by array position.

**Payments** are behind the `PaymentProvider` interface in
`src/payments/provider.interface.ts` — `createSession` + `verify`. Two adapters
exist: `ameriabank/` and `mock/` (dev). Rules:

- **Never trust the redirect querystring.** `verify()` confirms server-to-server.
- Extend the `name` union in the interface *and* the `PaymentProvider` enum in
  `schema.prisma` together when adding a provider.
- Amounts are whole AMD integers. No decimals, no cents.

**Images.** `multer` upload → `sharp` → `original.jpg` / `medium.jpg` /
`thumbnail.jpg` under `$UPLOAD_ROOT/artworks/<artwork-id>/`. Express serves
`/uploads` in dev; **Nginx serves it directly in production and those requests
never reach Node**, so don't put auth or logic in that route.

**Prisma.** Two sequences (`order_number_seq`, `ameriabank_order_id_seq`) exist
as hand-written SQL migrations because Prisma can't model them — see README §3.
Never run `migrate dev` against production; use `prisma:deploy`.

**Env vars** are validated in `src/config/env.ts`. Import `env` from there, never
read `process.env` directly. Tunables (rate limits, upload caps) live in
`src/config/constants.ts`.

---

## House rules

**Read before you write.** Open the actual file before proposing a change to it.
This codebase has enough local convention that guessing from the file name
produces plausible-looking wrong code.

**File header comments.** Every source file opens with its own path as a comment,
then a block comment explaining the file's role and any non-obvious decisions.
Match that when adding files — the existing headers are genuinely useful context.

**No duplicate source trees.** `backend_for_claude/` and `frontend_for_claude/`
copies existed at one point and have been deleted. Don't recreate that pattern:
work in `backend/src` and `frontend/src` directly.

**Prefer editing in place** over generating a parallel file for review.

## Current state

Known open items:

- Checkout order summary
- Profile order history
- Server-side wall-preview save — `WallPreview` table exists, endpoint doesn't
