# Gallery filters — the axis split

**Status:** shipped (steps 1–4) · year / colour / title-sort deferred (step 5)

## The problem this solves

The primary nav (`Photography`, `New arrivals`, …) and the gallery's on-page
`Categories` dropdown both act on the **same field** (category). Arriving at
`/gallery?category=photography` via the nav and then seeing a category picker
that can change or widen that selection makes the nav feel redundant and the
two controls feel like they're fighting.

The fix is not to hide the toolbar — it's to give the two controls **different
jobs**:

| Control | Owns | Examples |
|---|---|---|
| **Nav + breadcrumb** | *Which section am I in* (category) | Photography, Prints |
| **Filter panel** | *Refine within this section* (facets) | artist, price, orientation, sort |

Category stops being offered twice; the filter panel only ever refines the
current section.

## Shipped

- **Breadcrumb** in the page header: `Art prints / Photography`. `Art prints`
  links to the unfiltered gallery.
- **Active-filter chips** under the toolbar — one removable chip per active
  refinement (category, artist, orientation, price, search), plus **Clear all**
  when 2+ are active. Sort is not a chip (it always has a value).
- **H1 + breadcrumb reflect the single active category** ("Photography", not
  the generic "Art prints").
- `routerLinkActive` on the nav matches path **and** query exactly.
- **Single-category browse.** The toolbar has no category picker; category is
  the nav axis (`?category=<slug>`), shown as a breadcrumb + a removable chip.
- **Facet toolbar:** `Artist ▾` (multi, with counts) · `Price ▾` (from/to AMD)
  · `Shape ▾` (portrait / landscape / square, with counts) · `Sort ▾`
  (newest · price ↑ · price ↓) · search.
- **URL params** — `?category` `?artist` (slugs) · `?price=min-max` ·
  `?orientation=portrait,…` · `?sort=price-asc` · `?q`. Shareable and
  back/forward-safe.
- **One-directional data flow.** URL → state in the hydrate effect (reads
  guarded by `untracked()` so a filter change can't be clobbered by a
  not-yet-written URL); state → URL in `writeUrl()` (debounced). The list is
  fetched from signals, never the URL.
- **Backend:** `orientation` column on `Artwork` (migration
  `20260910090645_add_artwork_orientation`, backfilled from `widthCm`/
  `heightCm`, set on create/update). `GET /api/artworks/facets` →
  `{ artists:[{id,slug,name,count}], priceRange:{min,max}, orientations:[{key,count}] }`.
  List query gains `artistIds`, `priceMin`, `priceMax`, `orientation`, `sort`;
  cursor pagination stays stable across sorts (`id` tiebreaker in every
  `orderBy`).

### Nav → destination

Each primary-nav item now resolves to a real view:

| Nav item | Destination | Backed by |
|---|---|---|
| Art prints | `/gallery` | full catalogue |
| Photography | `/gallery?category=photography` | `photography` category |
| Artists | `/artists` | new index page (grid → `?artist=<slug>`) |
| New arrivals | `/gallery?new=1` | `createdAt` within 90 days (`NEW_ARRIVAL_DAYS`) |
| Collections | `/gallery` *(interim)* | **needs a `Collection` entity + curation UI** |
| Inspiration | `/#artists` *(interim)* | **needs an editorial / journal feature** |

`?new=1` and `?category=<slug>` are normal filter params — they hydrate,
chip, and clear like any other. `Collections` and `Inspiration` are the only
two still pointing at fallbacks; both are roadmap features, not filters.

### Deferred (step 5)

- **Sort by title** — needs a denormalised sort key (translations live in a
  side table). Only newest + price sorts ship.
- **Year / decade facet** — `year` exists; add the same way as price.
- **Colour** — not in the model; dominant-colour extraction, ties to the Art
  Finder.
- **Filter-scoped facet counts** — `/facets` counts are catalogue-global, not
  narrowed by the other active filters.

## What the art-print object gives us to filter on

From `Artwork` (+ relations) as it exists today:

| Field | Facet | Value | Notes |
|---|---|---|---|
| `categoryId` | Category | **nav axis** | Move out of the filter panel (see below). |
| `artistId` | **Artist** | high | Multi-select checklist. Needs an artist list with counts. |
| `basePrice` (whole AMD) | **Price** | high | Range (min/max). "From" price — the configurator adds size/frame on top. |
| `widthCm` / `heightCm` | **Orientation** | high | Derive `portrait / landscape / square`. Rows missing both dims are "unknown". |
| `widthCm` / `heightCm` | Size band | medium | Native source proportions; less shopper-relevant than the offered `PrintSize` range. Defer. |
| `year` | Year / decade | medium‑low | Art-historical, not décor-driven. Phase 2. |
| `medium` (free text, per-locale) | Medium | low | Needs normalising to a controlled vocabulary first. Data cleanup, not a v1 facet. |
| `isAvailable` | — | — | Public list already hard-filters to `true`. Not user-facing. |
| — | Colour | future | Not in the model. Dominant-colour extraction; ties into the Art Finder (WIKI §8.7). |

**Sort** (same toolbar, not a filter): newest (default), price ↑, price ↓,
title A–Z.

## Design

### URL params (all shareable, back-button-safe — same pattern as `?category`)

```
/gallery
  ?category=photography          (nav axis; slug, single)
  ?artist=marine-petrosyan,...   (facet; slugs, multi)
  ?price=20000-80000             (facet; min-max AMD)
  ?orientation=portrait          (facet; portrait|landscape|square, single or multi)
  ?year=1990-2010                (facet; range — phase 2)
  ?sort=price-asc                (newest|price-asc|price-desc|title-asc)
  ?q=pomegranate                 (search)
```

### Frontend

- New `GalleryFiltersComponent` — sidebar on desktop, slide-over drawer on
  mobile. Sections: **Artist** (checklist), **Price** (two AMD inputs +
  optional slider), **Orientation** (segmented control), **Sort** (select).
- Gallery gains signals `selectedArtistIds`, `priceRange`, `orientation`,
  `sort`; each folds into `resetAndFetch()` args, `writeUrl()`, and the
  hydrate effect using the **same `untracked()` one-directional pattern** as
  category.
- Chip computeds mirror `selectedCategories` for each facet (label + remove
  handler). No chip-row markup changes needed.
- `FacetsService` → `GET /api/artworks/facets` (see below).

### Backend

- `listArtworksQuerySchema`: add `artistIds` (csv→string[]), `priceMin`,
  `priceMax` (coerced int), `orientation` (enum), `year` range, `sort` (enum).
- `listForLocale` `where`: `artistId: { in }`, `basePrice: { gte, lte }`,
  orientation via `widthCm`/`heightCm` comparison (`gt` / `lt` / `equals`);
  rows with a null dim are excluded from an orientation filter.
- **Sort + cursor:** the cursor is `(createdAt desc, id desc)`. `price-*` and
  `title-*` sorts need a matching compound cursor (`(basePrice, id)` etc.) or
  an offset-pagination fallback for those modes. Decide per sort; newest stays
  cursor-based.
- `GET /api/artworks/facets` (optionally scoped by the active `where` minus
  the facet being rendered): `{ artists: [{id,slug,name,count}], priceRange:
  {min,max}, orientations: [{key,count}] }`. Cheaper and more reliable than
  computing ranges client-side across paginated results. Interim: reuse
  `GET /api/artists` for the list and hardcode orientation options.

## Sequencing

1. **✅ Breadcrumb + chips + category-as-context.**
2. **✅ Backend facets:** `sort`, `artistIds`, `priceMin/Max`, `orientation` on
   the list query; `/artworks/facets` endpoint. Cursor stays stable across
   sorts via the `id` tiebreaker — no special-casing needed.
3. **✅ Frontend facet toolbar:** Artist, Price, Shape, Sort — wired to URL
   params and chips.
4. **✅ Retired the category dropdown.** Category lives in nav + breadcrumb +
   chip; single-category browse.
5. **Deferred:** title sort (needs a denormalised key); Year facet;
   filter-scoped facet counts; colour-extraction groundwork for the Art Finder.
