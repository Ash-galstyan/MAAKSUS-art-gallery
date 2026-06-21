<!-- /README.md -->
# Art Gallery & Print Store

A full-stack online art gallery for the Armenian market. Angular frontend,
Node.js/Express + Prisma/PostgreSQL backend, Ameriabank vPOS payments, trilingual
EN/HY/RU UI and content, filesystem-based image storage served by Nginx.

## Repository layout

```
art-gallery/
├── backend/             # Node/Express/Prisma API
├── frontend/            # Angular SPA
├── docker-compose.yml   # Postgres for local dev
└── README.md            # this file
```

Each folder has its own `package.json` and is developed independently.

---

## 1. Prerequisites

- **Node.js 20+** (use [nvm](https://github.com/nvm-sh/nvm))
- **PostgreSQL 16** (run via Docker or natively)
- **Sharp's native bindings** — installed automatically by npm
- **An Nginx instance** for production (any 1.20+)

---

## 2. Local setup — first time

```bash
# 1. Clone
git clone <your-repo-url> art-gallery
cd art-gallery

# 2. Start Postgres
docker compose up -d

# 3. Backend
cd backend
cp .env.example .env
# Edit .env — at minimum set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
# (`openssl rand -base64 48` twice)
npm install
npm run prisma:migrate -- --name init
npm run seed
npm run dev                 # → http://localhost:3000

# 4. Frontend — in a second terminal
cd ../frontend
npm install
npm start                   # → http://localhost:4200
```

After seeding you have:
- An admin user: **`admin@gallery.local` / `admin12345`** (change in production)
- 4 categories, 3 artists, 6 artworks (no images yet — upload via admin UI or curl)
- 4 print sizes and 5 frame options ready for the customization page

### Adding artwork images

```bash
# Get an access token first
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@gallery.local","password":"admin12345"}' \
  | node -e 'console.log(JSON.parse(require("fs").readFileSync(0)).accessToken)')

# Upload a primary image
curl -X POST "http://localhost:3000/api/artworks/<artwork-id>/images?primary=true" \
  -H "Authorization: Bearer $TOKEN" \
  -F image=@/path/to/photo.jpg
```

Files land under `$UPLOAD_ROOT/artworks/<artwork-id>/` as `original.jpg`,
`medium.jpg`, `thumbnail.jpg`.

---

## 3. Database migrations & seed

```bash
cd backend
npm run prisma:migrate -- --name describes_the_change
```

**Two ad-hoc SQL migrations** are needed for sequences Prisma can't model.
After the first `prisma migrate dev`, create these as `--create-only`
migrations and add their bodies:

`*_add_order_number_sequence`:
```sql
CREATE SEQUENCE order_number_seq START 1 INCREMENT 1;
```

`*_add_ameriabank_order_id_sequence`:
```sql
CREATE SEQUENCE ameriabank_order_id_seq START 1 INCREMENT 1;
```

Then `npm run prisma:migrate` again to apply them.

Production deploys:
```bash
npm run prisma:deploy    # never `migrate dev` in prod
```

---

## 4. Adding a new language

The system supports any locale; EN/HY/RU are wired by default. Add a fourth
locale:

1. Add the locale to `Locale` enum in `backend/prisma/schema.prisma`, migrate.
2. Add to `supportedLocales` in `frontend/src/environments/environment.ts` (and prod).
3. Copy `frontend/src/assets/i18n/en.json` → `fr.json`, translate.
4. Add the language to `language-switcher.component.ts` arrays.
5. Translate existing content rows in DB (admin UI or Prisma Studio). Missing
   content translations fall back to EN via `pickTranslation` in
   `backend/src/lib/i18n-select.ts`.

---

## 5. Swapping the payment provider

The backend abstracts payments behind `PaymentProvider` in
`backend/src/payments/provider.interface.ts`. To add Idram / ArCa / Telcell:

1. Mirror `backend/src/payments/ameriabank/` as a new folder.
2. Implement `PaymentProvider` interface, export a singleton adapter.
3. Widen the `name` union in `provider.interface.ts` and the
   `PaymentProvider` enum in `schema.prisma`.
4. Update `backend/src/payments/index.ts` to return the right adapter by name.
5. Add a return-URL route in `payments.routes.ts`.

The `Order.paymentProvider` column records which provider was used per order.

---

## 6. Production deployment

Target setup: Ubuntu VPS, Node 20, Postgres 16, Nginx 1.20+ in front, TLS via
Let's Encrypt.

### VPS layout
```
/var/www/gallery/
├── web/            ← Angular dist (frontend/dist/art-gallery-frontend/browser)
├── backend/        ← compiled API (backend/dist + node_modules + prisma)
└── uploads/        ← image storage, written by API, served by Nginx
    ├── _tmp/
    └── artworks/
```

### Build
```bash
cd frontend && npm ci && npm run build
cd ../backend && npm ci && npm run build
```

Upload `frontend/dist/.../browser/*` → `/var/www/gallery/web/`
Upload `backend/dist`, `package.json`, `package-lock.json`, `prisma/` → `/var/www/gallery/backend/`

On the VPS:
```bash
cd /var/www/gallery/backend
npm ci --omit=dev
npx prisma migrate deploy
```

### systemd unit
```ini
# /etc/systemd/system/gallery-api.service
[Unit]
Description=Art Gallery API
After=network.target postgresql.service

[Service]
Type=simple
User=gallery
Group=gallery
WorkingDirectory=/var/www/gallery/backend
EnvironmentFile=/var/www/gallery/backend/.env
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Nginx
```nginx
server {
  listen 443 ssl http2;
  server_name gallery.example.com;
  ssl_certificate     /etc/letsencrypt/live/gallery.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/gallery.example.com/privkey.pem;

  location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 25M;
    proxy_read_timeout 30s;
  }

  location /uploads/ {
    alias /var/www/gallery/uploads/;
    access_log off;
    expires 30d;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
  }

  location / {
    root /var/www/gallery/web;
    try_files $uri $uri/ /index.html;
    location ~* \.(?:js|css|woff2?|ttf|eot|svg)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
    }
    location = /index.html {
      add_header Cache-Control "no-cache";
    }
  }
}
```

### Pre-launch checklist

- [ ] Postgres `pg_dump` cron set up + verified by a restore drill
- [ ] `uploads/` on its own volume with backup
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` regenerated for prod
- [ ] Admin password changed
- [ ] `AMERIABANK_*` switched to live hosts + live OrderID range
- [ ] `AMERIABANK_RETURN_URL` is HTTPS
- [ ] SMTP credentials configured, test password-reset email delivered
- [ ] Rate limits reviewed in `backend/src/config/constants.ts`
- [ ] Server clock NTP-synced (JWT validation is time-sensitive)

---

## 7. Cheat-sheet

```bash
# Backend
npm run dev               # watch mode
npm run build             # tsc → dist/
npm run start             # run dist/server.js
npm run prisma:migrate    # create + apply migration
npm run prisma:deploy     # apply pending (prod)
npm run prisma:studio     # browser DB explorer
npm run seed              # populate sample data
npm run typecheck         # tsc --noEmit

# Frontend
npm start                 # ng serve with backend proxy
npm run build             # production build
```

---

## 8. Out of scope (v1)

- **SSR.** Add `ng add @angular/ssr` later if SEO becomes a priority.
- **Full-text search.** Search is ILIKE on title; fine up to ~10k artworks.
  Upgrade: Postgres `tsvector` + GIN, or Meilisearch/Typesense.
- **Subscriptions / recurring billing.** Ameriabank supports card binding
  (`MakeBindingPayment`); see the adapter README.
- **Server-side wall-preview save.** Schema has `WallPreview` table; one
  POST endpoint + small client refactor away.
- **Mobile-optimised admin panel.** Functional, cramped — fine for v1.
