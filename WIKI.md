# Project Wiki — Art Gallery & Print Store

**Status:** living document · **Last consolidated:** 2026-09-09
**Sources:** `VISION.md`, `CHAPTERS.md`, `DISCUSSIONS.md`, `CLAUDE.md`, `README.md`

This is the single reference for what we are building and why. It consolidates the
outcome of the business-model, copy and architecture discussions into one picture.
Read this first; the source documents remain as the raw record.

> **Rule for this file:** it records *decisions and their reasoning*. Where the
> source documents disagree, the disagreement is named rather than quietly
> resolved — see [§13 Open decisions](#13-open-decisions). Coding conventions are
> **not** duplicated here; they live in `CLAUDE.md` and stay there.

---

## Table of contents

1. [The two-phase frame](#1-the-two-phase-frame)
2. [Brand and positioning](#2-brand-and-positioning)
3. [Customers and markets](#3-customers-and-markets)
4. [Revenue model](#4-revenue-model)
5. [Catalogue and supplier architecture](#5-catalogue-and-supplier-architecture)
6. [Fulfilment model](#6-fulfilment-model)
7. [Site information architecture](#7-site-information-architecture)
8. [Approved homepage copy](#8-approved-homepage-copy)
9. [Trade & Designers](#9-trade--designers)
10. [Collector's Circle](#10-collectors-circle)
11. [The product configurator](#11-the-product-configurator)
12. [Technical architecture as built](#12-technical-architecture-as-built)
13. [Open decisions](#13-open-decisions)
14. [Decision log](#14-decision-log)
15. [Roadmap](#15-roadmap)

---

## 1. The two-phase frame

The source documents describe two different businesses. They are not in conflict
once read as **sequence rather than alternatives**:

| | **Phase 1 — built and building** | **Phase 2 — the target** |
|---|---|---|
| Market | Armenia | Germany, Austria, Switzerland, Netherlands, France, Scandinavia |
| Currency | AMD, whole integers | EUR |
| Payments | Ameriabank vPOS | EU acquirer — Stripe or similar |
| Languages | EN / HY / RU | + DE / FR, likely NL |
| Catalogue | own artworks + seeded data | own catalogue fed by PGM, other suppliers, direct artists |
| Fulfilment | central (we inspect and ship) | hybrid (supplier-direct by default, central for premium) |

**Phase 1 is the real, running system.** `CLAUDE.md` and `README.md` describe code
that exists. `VISION.md` describes where it is going. The architecture decisions in
§5 and §6 exist specifically so Phase 2 does not require a rebuild.

The practical instruction that follows from this: **build Phase 1 features with
Phase 2 shapes.** Money is an integer in a currency field, not "AMD". Payments go
through the provider interface, not through Ameriabank. Locale is a lookup, not a
three-way switch.

---

## 2. Brand and positioning

The brand sells **ready-to-hang personalised interior decoration**, not posters.

> *"Customisable wall art that perfectly fits your interior."*

Three principles govern every product and platform decision:

1. **Premium customisation** — the customer designs a finished piece, not picks a SKU.
2. **Minimal inventory** — capital goes into experience and marketing, not stock.
3. **International sales** — designed for cross-border from the data model up.

### The positioning shift

The core insight is a change of verb. Instead of

> *Buy this print*

the customer does

> *Design your own finished artwork.*

They choose artwork, size, frame, mat colour, wall colour preview, orientation,
glass type and delivery country, and immediately see **"this is exactly how it
will look in my living room."** Purchase confidence is the product.

### Competitive advantage

Many sites sell prints. Few let a customer preview different frames, preview wall
colours, compare sizes visually, and customise the final presentation *before*
ordering. That interactive configurator is the differentiator — which is why it is
treated as core platform work, not a nice-to-have widget.

### Differentiators identified for later

- Upload a photo of your own room and preview artwork on the wall
- AI-assisted recommendations for artwork, frame and size based on the room
- Curated collections by interior style (Scandinavian, Minimalist, Industrial, Classic)
- Matching sets — diptychs, triptychs, gallery walls
- Certificates of authenticity for limited editions
- Loyalty for repeat customers and interior designers

### Tone of voice

Premium, artistic, international, concise. Contemporary European gallery meets
high-end interior magazine. Explicitly **not** a generic poster shop and not a
tech-startup aesthetic.

Two standing copy rules, both established during the copy pass:

- **Don't overuse "museum quality."** Powerful once or twice; repeated everywhere it
  reads as marketing filler.
- **Don't lead with discounts.** "Get 10% off your first purchase" as the first
  message weakens premium positioning. Introductory benefits can come later.

---

## 3. Customers and markets

### Primary customers

Homeowners · apartment owners · interior designers · architects · hotels · cafés ·
offices · Airbnb owners · gift buyers

Note the split this implies: a **B2C collector** journey and a **B2B trade**
journey, sharing one catalogue but needing different pricing, tooling and
onboarding. That split is why Trade & Designers gets a full homepage chapter (§9)
rather than a footer link.

### Target markets (Phase 2)

Germany · Austria · Switzerland · Netherlands · France · Scandinavia

Chosen because these markets already buy online and pay for premium home décor.

### Customer journey

```
Instagram / Pinterest / Google Search
        ↓
   Website
        ↓
   Customise artwork
        ↓
   See it on selected wall colour
        ↓
   Checkout
        ↓
   Production
        ↓
   Delivery
        ↓
   Review
        ↓
   Referral discount
```

### Marketing channels

- **Organic** — Pinterest, Instagram, interior-design blogs, SEO
- **Paid** — Google Shopping, Meta Ads, Pinterest Ads
- **Email** — abandoned carts, new collections, seasonal campaigns, designer newsletters

> ⚠️ **SEO note.** SSR is explicitly out of scope for v1 (`README.md` §8). The
> marketing plan leans on SEO and Google Shopping. These two facts collide the
> moment Phase 2 marketing starts — `ng add @angular/ssr` is a Phase 2
> prerequisite, not an optional upgrade.

---

## 4. Revenue model

Eight streams, roughly in order of expected contribution:

| # | Stream | Notes |
|---|---|---|
| 1 | **Art prints** | Main revenue. Example sizes 30×40, 50×70, 70×100 cm |
| 2 | **Frames** | Black, white, oak, walnut, floating, premium metal. Attractive margins |
| 3 | **Canvas prints** | Higher-priced alternative to paper |
| 4 | **Acrylic prints** | Premium line |
| 5 | **Limited editions** | 100 copies, signed, numbered, certificate included |
| 6 | **Commercial projects** | Hotels, restaurants, universities, offices, hospitals, developers. Significant B2B potential |
| 7 | **Interior designer program** | Trade pricing, sample kits, project discounts, commissions, dedicated support |
| 8 | **Digital downloads** | Selected designs as files for customers who print locally |

### Cost structure

- **Variable** — printing, framing, packaging, shipping, payment fees, advertising
- **Fixed** — website, platform/software, product photography, marketing, administration

Frames matter disproportionately: they carry good margin and they are the thing the
configurator is best at selling. A configurator that makes frame choice easy and
visual is a margin lever, not just UX polish.

### Illustrative financial targets

> ⚠️ **These are illustrative placeholders, not a model.** They assume figures we
> have not yet validated and must be refined against real pricing, conversion
> rates, shipping costs and target markets before being used for any decision.

Assumptions: average order value **€180**, gross margin **55%**.

| Year | Orders/month | Orders/year | Revenue |
|---|---:|---:|---:|
| 1 | 80 | 960 | ~€173,000 |
| 2 | 250 | 3,000 | ~€540,000 |
| 3 | 700 | 8,400 | ~€1.51M |

---

## 5. Catalogue and supplier architecture

**This is the most consequential decision in the project.**

### The decision

Sell products from **PGM plus other art suppliers and individual artists** — with
**our own central catalogue** as the single source of truth. PGM, other suppliers
and artists all feed *into* it.

Rejected alternatives: PGM-only synchronisation (creates a single-supplier
dependency), and own-catalogue-with-PGM-imports-only (same problem, later).

### Why

Even if we launch with PGM only, this prevents the site from becoming technically
dependent on one supplier, and leaves room for exclusive artists and collections.
Customers must experience **one coherent brand**, never the underlying supplier
structure.

### The data-model consequence

Every artwork has **our own internal product ID**. The backend maps that ID to:

- supplier SKU
- supplier pricing
- availability
- production options
- lead times
- images
- fulfilment rules

This mapping layer is what makes it possible to change suppliers later without
touching the customer-facing catalogue.

### Required product fields from day one

Even while everything is centrally fulfilled, every product carries:

| Field | Phase 1 value | Purpose |
|---|---|---|
| `Supplier` | populated | which source this artwork comes from |
| `SupplierSKU` | populated | mapping to their catalogue |
| `FulfilmentMethod` | `Central` for everything | flips to `Direct` to enable hybrid |
| `ProductionLeadTime` | populated | drives delivery promises |
| `SupplierCost` | populated | margin calculation, trade pricing |
| `StockAvailabilitySource` | populated | where availability is read from |
| `ShippingOrigin` | populated | shipping cost and customs |
| `DropshipEligible` | populated | gates the Phase 2 switch |

**Populate these from launch.** Backfilling them later across a live catalogue is
the expensive version of this decision.

### PGM integration reality

Research found **no public API** at PGM Art World (pgm.de) — no REST docs, no
developer portal, no stock/inventory API, no dealer integration guide, no webhooks,
no EDI specs.

That does not mean integration is impossible. B2B print suppliers commonly offer
privately: dealer-only XML/CSV feeds, FTP/SFTP inventory exports,
password-protected reseller APIs, platform app integrations, or manual catalogue
exports — typically only after becoming a reseller or partner.

**Action outstanding:** ask PGM directly, in these words —

> *"Do you provide a REST API, XML/CSV feed, or dealer portal for synchronizing
> product catalog and stock availability with external e-commerce websites?"*

Ask specifically for: reseller/dealer API access, stock feed, product catalogue
export, availability endpoint, image feed, pricing feed, dropshipping integration.

**Important nuance:** PGM produces many artworks on demand in custom sizes and
materials, so their "stock" is probably **not traditional inventory**. Expect
product metadata, SKU availability, printability status, lead times and pricing
matrices rather than live warehouse counts. Design the availability model around
*printability + lead time*, not units-in-stock.

**Fallbacks if no feed exists:** periodic CSV/XML import automation; a manual
admin sync workflow; middleware against their storefront platform. A scraper only
if their terms permit it.

---

## 6. Fulfilment model

### The decision

**Launch on Model B (central fulfilment), architected for Model C (hybrid).**

```
Phase 1 — B, Central
Customer → Website → Order → Supplier(s) → Our fulfilment point
        → Quality check & packaging → Customer

Phase 2 — C, Hybrid
Standard products  → supplier produces, frames, packages, ships direct
Special editions,  → through our own fulfilment for quality control
local artists,
premium pieces
```

Model A (pure supplier-direct) was set aside for launch.

### Why B first

At launch we control quality, packaging and the unboxing experience — which matters
a great deal for a premium fine-art brand where the first physical impression *is*
the brand. The cost is working capital and handling time, which Phase 2 removes.

### Why C is the destination

`VISION.md` argues for holding no inventory: customer orders → print partner prints
→ frame partner frames → package → ship directly, minimising working-capital needs.
Model C is how that is reached without giving up quality control on the pieces
where it matters.

> ⚠️ **Note the tension honestly.** The vision document's "avoid holding inventory"
> and the launch decision "central fulfilment" pull in opposite directions. The
> resolution is temporal: B is a deliberate, temporary trade of capital efficiency
> for brand control, and `FulfilmentMethod` is the switch that pays it back.

### Target technology chain

```
Website → Customizer → Payment → Automatic order creation
        → Print partner → Shipping → Tracking
```

The goal is **minimal manual work**. Every manual step in Phase 1 central
fulfilment should be logged as something Phase 2 automates.

---

## 7. Site information architecture

### The homepage story

```
Hero → Discover Art → Shop by Room → Craftsmanship
     → Trade & Designers → Collector's Circle
     → Artists & Stories → Art Finder → Newsletter
```

**The homepage is not a catalogue.** It progressively answers four questions in the
visitor's mind:

1. *"Do I like this?"*
2. *"Can I find something for my space?"*
3. *"Can I trust the quality?"*
4. *"Why should I build a relationship with this company?"*

Trade services and Collector's Circle answer question four. They are what make the
site distinctive rather than a conventional art-print store.

### Navigation

**Main:** Art Prints · Photography · Artists · Collections · New Arrivals · Inspiration

**Right side:** Trade & Designers · Sign In · Search · Cart

**Collector's Circle** as a prominent but elegant secondary button.

Keep navigation simple enough that the artwork stays the focus.

### Top announcement bar

Four trust signals. Note that **"Trade & Designers" replaces "Sustainable
Practices"** from the original mockup — trade customers are strategically more
important and this gives that audience immediate visibility.

### Visual direction

Contemporary European art gallery meets high-end interior design magazine. Quiet
luxury, timeless, cultured, architectural, highly curated. Generous white and warm
off-white space, subtle warm stone and sand tones, charcoal typography, restrained
muted accents. Elegant serif display type paired with clean modern sans-serif UI
type. Large immersive artwork photography, close-up detail of paper texture and
frames, editorial grid, refined micro-interactions.

**Avoid:** generic e-commerce-platform aesthetics, excessive rounded cards,
gradients, bright colours, clutter, tech-startup styling.

---

## 8. Approved homepage copy

Copy below is approved and ready to implement. Every user-facing string needs
**all three** i18n bundles (`en`/`hy`/`ru`) — an en-only key silently degrades.

### 8.1 Top announcement bar

**MUSEUM-QUALITY PRINTS** — Made with archival-grade materials
**EXPERT FRAMING** — Crafted with precision
**TRADE & DESIGNERS** — Professional services & pricing
**WORLDWIDE DELIVERY** — Art delivered with care

### 8.2 Hero

> # ART, BEAUTIFULLY MADE.
>
> Exceptional art prints, crafted with museum-quality materials and made to
> transform the spaces you live and work in.
>
> **EXPLORE ART** · **SHOP BY ROOM**

"Explore Art" rather than "Explore Art Prints" — more premium, less transactional.

*Alternative, if positioning leans further toward interiors:*
**ART FOR REMARKABLE SPACES.** — *Curated fine art, photography and exceptional
framing for homes, workplaces and hospitality interiors.* For the main consumer
homepage, "Art, beautifully made." is stronger.

### 8.3 Curated discovery

> # FIND ART THAT SPEAKS TO YOU
>
> Discover works selected for different tastes, spaces and ways of living.

| Tile | Line |
|---|---|
| **NEW ARRIVALS** | Fresh discoveries for your walls |
| **ABSTRACT** | Colour, form and expression |
| **PHOTOGRAPHY** | Remarkable moments, beautifully captured |
| **MODERN & CONTEMPORARY** | Art for today's interiors |
| **BLACK & WHITE** | Timeless. Graphic. Refined. |
| **CURATED COLLECTIONS** | Stories told through art |

Highly visual; short descriptions; let the artwork do the work.

### 8.4 Shop by space

Placed high on the page, because many people buy art to solve an interior-design
problem rather than because they know an artist's name.

> # ART, IN ITS PLACE
>
> See how the right artwork can transform a room.
> Explore curated selections created for different spaces, proportions and moods.

| Tile | Line |
|---|---|
| **LIVING ROOM** | Make a statement |
| **BEDROOM** | Create a quieter atmosphere |
| **DINING ROOM** | Bring people together |
| **OFFICE** | Give the space character |
| **HOSPITALITY** | Create memorable interiors |

**EXPLORE BY ROOM**

This is the natural home for a future **"View in Room"** / AR visualisation feature.

### 8.5 Quality and craftsmanship

> # MADE TO BE LIVED WITH
>
> Beautiful art deserves exceptional craftsmanship.
>
> From archival papers and fine-art printing to carefully selected frames and
> finishing, every piece is produced with attention to detail and made to retain
> its beauty for years to come.

| Pillar | Line |
|---|---|
| **FINE ART PRINTING** | Exceptional colour, detail and tonal depth. |
| **ARCHIVAL MATERIALS** | Premium papers selected for their character and longevity. |
| **EXPERT FRAMING** | Frames chosen to complement the artwork, not compete with it. |
| **MADE WITH CARE** | Each work is prepared specifically for your order. |

**DISCOVER OUR CRAFT**

### 8.6 Artists and stories

> # BEHIND THE ART
>
> Meet the artists, photographers and image-makers behind the works.
>
> Explore their ideas, inspirations and stories—and discover the creative process
> behind the art you bring into your space.
>
> **MEET THE ARTISTS** · **READ THE STORIES**

One large editorial photograph, not six product cards. A premium art site needs
editorial content or it becomes only a catalogue.

### 8.7 Art finder

> # NOT SURE WHERE TO START?
>
> Finding art should be inspiring, not overwhelming.
>
> Tell us about your space, colours and style, and we'll help you discover works
> that feel right for you.
>
> **FIND YOUR ART** — *Takes less than 2 minutes.*

Intended flow: **room → preferred style → colours → orientation → approximate size
→ budget → recommendations.** Expected to materially improve conversion for
customers who like art but don't know how to search for it.

### 8.8 Newsletter

> # A LITTLE MORE ART IN YOUR INBOX
>
> New artists, remarkable interiors, curated collections and stories worth
> discovering.
>
> *Email address* → **JOIN US**

Don't call it "newsletter." Don't lead with a discount.

### 8.9 Footer brand statement

> Art has the power to change how a space feels.
>
> We bring together exceptional images, fine-art printing and expert craftsmanship
> to make finding and living with art beautifully simple.

> ⚠️ The source draft headed this block **"PGM ART WORLD."** That was written when
> the exercise was framed as a PGM redesign. **PGM is a supplier, not our brand** —
> the heading is a placeholder awaiting the storefront brand name. See §13.

---

## 9. Trade & Designers

Trade deserves a **substantial homepage chapter**, not a small navigation link.

The strategic principle: **do not present wholesale as "bulk discounts."** For a
fine-art brand, Trade & Designers should feel like a professional service
ecosystem — project folders, client presentations, specification sheets, samples,
custom sizing, quotations, preferential pricing. That preserves luxury positioning
*and* gives designers a strong reason to create an account.

Use **"Become a Trade Partner"**, never "Wholesale Account."

### Audiences

Interior Designers · Architects · Hospitality · Art Consultants · Galleries ·
Corporate Buyers · Property Developers

### Homepage copy

> # ART FOR EXCEPTIONAL SPACES
> ## Trade & Design Professionals
>
> A dedicated art service for interior designers, architects, hospitality
> professionals, galleries and commercial projects.
>
> Access professional pricing, project support, custom formats, framing solutions
> and curated collections for spaces of every scale.

| | |
|---|---|
| **PROFESSIONAL PRICING** | Preferential terms for approved trade partners |
| **PROJECT SUPPORT** | From a single interior to large-scale installations |
| **CUSTOM FORMATS** | Flexible sizing and framing for your specifications |
| **ART SOURCING** | Curated recommendations for your project and brief |

**BECOME A TRADE PARTNER** · **DISCOVER TRADE SERVICES**

### The designer story

> # DESIGNED AROUND YOUR PROJECT
>
> Finding the right art should be as considered as every other element of an
> interior.
>
> Create project collections, compare formats and frames, prepare selections for
> clients and request tailored quotations—all in one place.

| | |
|---|---|
| **Create project collections** | Organise artworks by client, property or room. |
| **Present to your clients** | Build beautiful, shareable art selections. |
| **Specify with confidence** | Access dimensions, materials, framing options and product information. |
| **Request project pricing** | Receive tailored quotations for larger or multi-piece orders. |

**EXPLORE SERVICES FOR DESIGNERS**

This is expected to become one of the strongest competitive differentiators of the
site.

### Trade account capabilities

Trade account application · professional pricing · tiered volume discounts · large
project quotations · custom sizing · bespoke framing · curated art sourcing ·
sample ordering · project-based collections · commercial licensing information ·
tax/VAT documentation · dedicated account manager · priority production ·
international project delivery

### Trade Dashboard

A professional art-specification platform crossed with a luxury gallery. Designers
can:

- create multiple client projects
- build project moodboards
- save artwork collections
- organise artwork by room
- specify dimensions and frames
- request quotations
- download high-resolution presentation images
- download specification sheets
- see trade prices
- check product availability
- reorder previous projects
- share private collections with clients

> **Engineering implication:** this is a second application surface with its own
> role, pricing rules, and sharing model — not a discount flag on a user row.
> Plan for it in the RBAC model early even if it ships later.

---

## 10. Collector's Circle

**Avoid points.** For fine art, loyalty should communicate **belonging,
recognition and access** — not supermarket-style accumulation. "Collector's Circle"
is deliberately a better concept than a conventional "Rewards Program."

### Homepage copy

> # THE COLLECTOR'S CIRCLE
>
> For those who believe there is always room for one more remarkable piece.
>
> Join our Collector's Circle and enjoy a more personal way to discover and
> collect art.

| | |
|---|---|
| **EARLY ACCESS** | Discover selected new releases before everyone else. |
| **MEMBER PRIVILEGES** | Enjoy benefits that grow with your collection. |
| **PERSONAL RECOMMENDATIONS** | Discover art selected around your tastes and interests. |
| **EXCLUSIVE COLLECTIONS** | Access special releases and limited opportunities. |

**JOIN THE COLLECTOR'S CIRCLE** — *Membership is complimentary.*

> That last line is load-bearing. A premium-sounding "Circle" otherwise makes
> visitors assume it costs money. Do not drop it.

### The three levels

Show only a glimpse on the homepage; a dedicated page explains the mechanics.

**COLLECTOR** — *Your introduction to the Circle.*
Early access, personal favourites, member benefits and tailored recommendations.

**PATRON** — *For those building a collection.*
Enhanced privileges, framing benefits, complimentary samples and priority service.

**CURATOR** — *Our highest level of recognition.*
Private releases, personal art sourcing, priority production and our most exclusive
benefits.

**DISCOVER MEMBERSHIP**

Levels are based on **annual purchasing or lifetime relationship**, not on visibly
accumulating points. Progress is shown elegantly and subtly.

### Trade Circle

A parallel programme for professional customers, where annual purchasing unlocks
progressively better trade pricing, samples, project services and priority
production.

---

## 11. The product configurator

The configurator is the competitive advantage (§2), so it gets first-class
treatment. It should feel like **commissioning a gallery-quality piece, not
configuring a commodity product**.

### Option chain

```
Print size → paper → border/mat → frame → glazing → quantity
```

With **dynamically updated price and production time** at every step.

### Required elements

- Large artwork preview with realistic room visualisation
- Extreme-detail artwork zoom
- Frame corner / material samples
- Paper texture previews
- Artist biography and artwork story
- Edition information and certificate of authenticity
- Dimensions
- Estimated production and delivery
- **"View on Your Wall"** visualisation
- Complementary artwork recommendations

### Current state

A working customiser exists with live preview, frame options, wall/background
colour picker with custom colour input, quantity selector, order configuration
summary and cart-ready price calculation. The gap to the target above is: room
photo upload, detail zoom, material sample views, edition/COA data, and production
time estimates driven by `ProductionLeadTime` (§5).

`WallPreview` exists as a database table but has no endpoint — saving a preview
server-side is one POST endpoint plus a small client refactor.

---

## 12. Technical architecture as built

> Conventions and gotchas live in `CLAUDE.md`; setup, migrations and deployment in
> `README.md`. This section is orientation only — **do not duplicate those files
> here.**

### Shape

```
art-gallery/
├── backend/    # Express 4 + Prisma 5 + PostgreSQL 16
├── frontend/   # Angular 18.2 SPA, standalone + signals
├── uploads/    # image storage (gitignored)
└── docker-compose.yml
```

Development happens on **Windows**; README paths assume nvm/bash and need adapting.

### Frontend

Modern Angular only — standalone components, `inject()`, `signal()`/`computed()`,
new control flow (`@if`/`@for`/`@switch`), `input()`/`output()` functions. No
NgModules exist and none should be added. Service state lives in signals exposed
read-only.

`ApiService` is **promise-based**, wrapping `HttpClient` and unwrapping the
`{ data }` envelope. Feature services `await` it; they don't return observables.

Trilingual EN/HY/RU via `I18nService.t('dot.path.key')`, bundles loaded lazily.
Backend locale codes are uppercase, frontend lowercase — `localeServer()` maps.

### Backend

Every domain module is a quad: `routes` / `controller` / `service` / `schemas`.
Layering is strict — controllers don't touch Prisma, services don't touch req/res.
Responses are `{ data: T }` or `{ data: T[], nextCursor }`; pagination is
**cursor-based**.

Translatable models each have a sibling `*Translation` table, always read through
`pickTranslation()` with locale → EN → first-available fallback.

Payments sit behind the `PaymentProvider` interface (`createSession` + `verify`),
with Ameriabank and mock adapters. **Never trust the redirect querystring** —
`verify()` confirms server-to-server. Amounts are whole AMD integers.

Images: multer → sharp → `original` / `medium` / `thumbnail`. Nginx serves
`/uploads` directly in production, so no auth or logic belongs in that route.

### Quality bar

There is no test suite. `npm run typecheck` plus a manual pass is the bar.

### Known open items

- Checkout order summary
- Profile order history
- Server-side wall-preview save

### Phase 2 gap list

What Phase 2 (§1) requires that Phase 1 does not have:

| Area | Gap |
|---|---|
| Currency | Multi-currency; EUR alongside AMD. Integer-minor-unit handling per currency |
| Payments | EU acquirer adapter behind the existing `PaymentProvider` interface |
| Tax | EU VAT / OSS handling, VAT documentation for trade accounts |
| Locales | DE / FR (+ likely NL) added per README §4 |
| SEO | SSR — currently out of scope, but the marketing plan depends on it |
| Search | ILIKE search is fine to ~10k artworks; supplier feeds will blow past that. `tsvector` + GIN, or Meilisearch/Typesense |
| Catalogue | Supplier import pipeline (§5) and the eight supplier fields |
| Fulfilment | `FulfilmentMethod = Direct` path and supplier order routing |
| Accounts | Trade role, trade pricing, Trade Dashboard |
| Loyalty | Collector's Circle tiers on annual/lifetime spend |
| Shipping | International shipping architecture, customs, per-origin rates |

---

## 13. Open decisions

These are genuinely unresolved. Do not assume answers.

### 13.1 Launch geography and warehouse location — **blocking**

The discussion stopped exactly here. Two questions, unanswered:

1. **Where do we sell at launch?** Armenia only · Armenia + selected countries ·
   EU/Europe · worldwide from day one
2. **Where is the initial central fulfilment point located?**

These two answers determine shipping architecture, currencies, VAT/tax handling,
payment providers, and what delivery promises can honestly go on the site. Most of
the Phase 2 gap list can't be sequenced until they are settled.

### 13.2 The storefront brand name

`VISION.md` uses **Maaksus** (restarting Maaksus LLC). `CHAPTERS.md` footer copy
says **PGM Art World**. The working position is that **PGM is a supplier, not the
brand** — the footer heading is a leftover from when the copy exercise was framed
as a PGM redesign. The actual storefront brand name is still to be confirmed, and
the footer block in §8.9 stays headless until it is.

### 13.3 PGM feed access

No public API. Whether a dealer feed exists is unknown until PGM is asked (§5).
The import architecture should be designed to accept CSV/XML regardless, so this
answer changes effort, not design.

### 13.4 Financial model

The figures in §4 are illustrative. A real model — pricing strategy, margin
calculator, unit economics per product line — does not exist yet.

### 13.5 Deferred but named

Offered and not yet taken up: Business Model Canvas · 5-year financial model
(P&L, cash flow, balance sheet) · pricing strategy and margin calculator ·
European logistics model · marketing and customer-acquisition plan · 12-month
implementation roadmap with milestones.

---

## 14. Decision log

| # | Decision | Rationale | Status |
|---|---|---|---|
| D1 | **Custom-built site**, not Shopify/WooCommerce/Magento | Stated choice; no rationale recorded. What it buys: full control of the configurator, trade accounts, loyalty and multi-supplier catalogue | ✅ Decided |
| D2 | **Own central catalogue** fed by PGM + other suppliers + artists | Avoids single-supplier technical dependency; room for exclusive artists | ✅ Decided |
| D3 | Internal product ID mapped to supplier SKU/price/availability/lead time | Change suppliers without touching the customer-facing catalogue | ✅ Decided |
| D4 | Eight supplier fields populated **from day one** | Backfilling across a live catalogue is expensive | ✅ Decided |
| D5 | **Central fulfilment at launch, hybrid architected in** | Control quality/packaging/unboxing while premium brand is established | ✅ Decided |
| D6 | Trade gets a **full homepage chapter**, not a nav link | Trade customers are strategically more important than the mockup implied | ✅ Decided |
| D7 | "Trade & Designers" replaces "Sustainable Practices" in the announcement bar | Immediate visibility for the strategically important audience | ✅ Decided |
| D8 | **"Become a Trade Partner"**, not "Wholesale Account" | Positions a relationship, not a discount tier | ✅ Decided |
| D9 | Loyalty = **Collector's Circle**, access-based, no points | Fine-art buyers want access and recognition, not supermarket mechanics | ✅ Decided |
| D10 | Tiers **Collector → Patron → Curator**, on annual/lifetime spend | Recognition scales with relationship, invisibly | ✅ Decided |
| D11 | Parallel **Trade Circle** for professional customers | Same recognition logic, trade-appropriate benefits | ✅ Decided |
| D12 | Hero: **"Art, beautifully made."** | Emotional value before manufacturing detail | ✅ Decided |
| D13 | Homepage is a **story, not a catalogue** | Answers the four questions in sequence | ✅ Decided |
| D14 | Armenia first, Europe as Phase 2 | Build Phase 1 features with Phase 2 shapes | ✅ Decided |
| D15 | PGM is a **supplier**, not the storefront brand | Multi-supplier architecture makes any single supplier a source, not an identity | ✅ Decided |
| — | Launch geography + warehouse location | — | ⛔ Open (§13.1) |
| — | Storefront brand name | — | ⛔ Open (§13.2) |
| — | PGM feed access | — | ⛔ Open (§13.3) |

---

## 15. Roadmap

### Now — finish Phase 1

- Checkout order summary
- Profile order history
- Server-side wall-preview save (`WallPreview` endpoint)
- Add the eight supplier fields to the product model, `FulfilmentMethod = Central`

### Next — unblock

- Ask PGM the feed question (§5) and record the answer here
- Settle launch geography and warehouse location (§13.1)
- Settle the storefront brand name (§13.2)
- Build a real financial model to replace §4's placeholders

### Then — the differentiators

- Configurator completion: room photo upload, detail zoom, material samples, live
  production-time estimate
- Art finder questionnaire (§8.7)
- Trade accounts, trade pricing, Trade Dashboard (§9)
- Collector's Circle tiers (§10)

### Later — Phase 2

Work the gap list in §12 in the order the §13.1 answers dictate.

---

*When a decision in this file changes, update it here in the same session it is
made. A wiki that lags reality is worse than no wiki.*
