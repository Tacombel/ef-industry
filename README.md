# EVE Frontier Industry Calculator

> v1.52.2 — README updated 2026-05-04 (local HEAD: `d2d28b1`)

A fan-made web tool for the blockchain game **EVE Frontier**. Calculates blueprint production chains, optimizes mining trips, and tracks inventory across Smart Storage Units (SSUs) pulled directly from the Sui blockchain.

## Features

### Calculator
- **Single-item calculation** — pick any item, set quantity, get full breakdown
- **Collection packs** — group multiple blueprints into a pack for batch calculation; import from ship fit text
- **Multi-factory support** — items craftable in multiple facilities show all options; switch factory to recalculate
- **Recipe tooltips** — hover any factory/refinery badge to see inputs, outputs, and batch size
- **Ore optimization** — greedy algorithm picks the best ore sources to minimize mining volume
- **Trip estimation** — mining trips calculated from cargo capacity and mining rate; per-ore breakdown
- **Stock deduction** — SSU inventory factored in; raw materials, intermediates, and final products show what you already have
- **Factory/refinery overrides** — per-item preferences persist between sessions (requires login)

### Blockchain integration (Sui)
- **Wallet login** — authenticate via EVE Vault browser extension (nonce-based, similar to SIWE)
- **SSU discovery** — automatically finds all Smart Storage Units owned by your EVE character
- **On-chain inventory** — reads SSU contents directly from the Sui blockchain
- **SSU status** — online/offline status and capacity bars per SSU

### Catalogue
- **Items** — 200+ game items with typeId, categories, ore/loot/found tags
- **Blueprints** — crafting recipes with factory, inputs, output quantity, and run time
- **Decompositions** — ore reprocessing rules per refinery, including two-level found-item chains
- **Factories & Refineries** — facility listing with related blueprint/decomposition counts
- **Asteroids** — asteroid types, locations, and which ores they contain

### Authentication & Admin
- **Password + wallet** dual auth (username/password or EVE Vault wallet)
- **Role system**: SUPERADMIN → ADMIN → USER
- **Admin panel** — user management, registration toggle, usage metrics, DB backup/restore
- **Remote backup** — rsync + SSH to remote server with automatic nightly cron

---

## Installation

### Option A — Local development (Node.js)

**Requirements:** Node.js v18+, npm, Git

```bash
git clone https://github.com/Tacombel/ef-industry.git
cd ef-industry
npm install
```

Create `.env` (copy from `.env.example`):

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET=<generate with: openssl rand -base64 32>

# Optional — only needed for SSU / blockchain features
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
EF_WORLD_API_URL=https://world-api-stillness.live.tech.evefrontier.com
EF_PACKAGE_ID=0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c
```

Apply migrations and seed:

```bash
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts
```

Run in development mode:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Open [http://localhost:3000](http://localhost:3000).

### Option B — Docker

```bash
# Set required env vars
export JWT_SECRET="$(openssl rand -base64 32)"
export INITIAL_SUPERADMIN_PASSWORD="<strong password>"

docker-compose up --build -d
```

### Option C — Production build

```bash
npm run build
npm start
```

---

## Environment variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | — | SQLite path (e.g. `file:./dev.db`) |
| `JWT_SECRET` | Yes | — | Session signing secret |
| `SUI_RPC_URL` | No | `https://fullnode.testnet.sui.io:443` | Sui blockchain RPC node |
| `EF_WORLD_API_URL` | No | `https://world-api-stillness.live.tech.evefrontier.com` | EVE Frontier World API |
| `EF_PACKAGE_ID` | No | `0x28b4…448c` | EVE Frontier package on Sui |
| `ALLOW_DATA_MUTATIONS` | No | — | Set to `1` to enable write ops on static game data |
| `INITIAL_SUPERADMIN_USERNAME` | No* | `admin` | Username for the first SUPERADMIN (seed) |
| `INITIAL_SUPERADMIN_PASSWORD` | No* | — | Password for the first SUPERADMIN (seed) |

\* Required on first deploy (seed creates the initial SUPERADMIN). Ignored if users already exist in DB.

---

## Auth flow

### First deploy
1. Set `INITIAL_SUPERADMIN_PASSWORD` in env before first start
2. Seed creates the SUPERADMIN account
3. Login with username/password, go to Admin panel, close registration

### Subsequent users
- Register via **EVE Vault wallet** (no password needed)
- Or use **username/password** if registration is open

### Roles
- **SUPERADMIN** — full access (admin panel, user management, backup, data mutations)
- **ADMIN** — admin panel access, limited user management (cannot touch SUPERADMINs)
- **USER** — own collections and preferences only

---

## Tech stack

- **Next.js 14** (App Router, standalone Docker output)
- **Prisma 5** + SQLite
- **Tailwind CSS**
- **TypeScript**
- **jose** — JWT session management (httpOnly cookies, 7-day TTL)
- **bcryptjs** — password hashing
- **Sui blockchain** (`@mysten/sui` / JSON-RPC) — wallet auth, SSU inventory, on-chain data
- **Docker** — multi-stage build, non-root user, healthcheck
- **Vitest** — test suite (42 tests, calculator + dev-guard coverage)

---

## Session diary

This project uses OpenCode's `/cierrate` custom command to generate a per-session diary in `docs/sesiones/`. At the end of each working session, running `/cierrate` produces a narrative summary of what was done, decisions made, problems encountered, and pending TODOs.

---

## License

© tacombel@gmail.com

<!-- LAST_README_UPDATE: d2d28b1 (chore: add session notes and analysis files to .gitignore) — update this hash when you next edit the README so you know what range of changes to cover -->
