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

## Data sources

### Industry blueprints & facilities

Extracted from the **EVE Frontier game client** using [Phobos](https://github.com/ProtoDroidBot/Phobos/tree/fsdbinary-t1)
(fork `fsdbinary-t1`, requires Python 3.12):

```bash
python run.py -e "C:\CCP\EVE Frontier" -s stillness -j <output_dir> -l "industry_blueprints,industry_facilities"
```

The tool reads FSD binary files from the client's `ResFiles/` via the `.pyd` loaders
in `stillness/bin64/` and `stillness/code.ccp`. Output is written to
`<output_dir>/fsd_built/` and then copied to `EF-static/`.

| File | Type | Records | Current |
|------|------|---------|---------|
| `industry_blueprints.json` | Blueprint recipes (inputs, outputs, runTime) | 221 | `EF-static/industry_blueprints.json` |
| `industry_facilities.json` | Facility definitions (capacity, allowed blueprints) | 12 | `EF-static/industry_facilities.json` |

**Last extracted:** 2026-05-06 via Phobos (commit `e10cd9f`).

### Types

Retrieved from the **EVE Frontier World API** at `EF_WORLD_API_URL`:

```
GET /v2/types?limit=500&offset=0
```

Returns item type definitions (id, name, group, category, mass, volume, etc.).
Only published types available in the API are included (~392 records).

Some TypeIDs referenced in blueprints may not appear in this API response
(typically unpublished or expansion items). These are included automatically
during seed generation because the transformation script pulls in any TypeID
referenced as a blueprint input/output, regardless of whether it exists in
`types.json`.

| File | Type | Records | Current |
|------|------|---------|---------|
| `types.json` | Item type definitions | ~392 | `EF-static/types.json` |

### Seed data

The application does **not** read `EF-static/` files directly. All game data is
consolidated into `prisma/seed.json`, which is loaded into SQLite via:

```bash
npx tsx prisma/seed.ts
```

The seed format is a curated superset of the three source files above. Most
content is sourced directly from the game data, with the following additions:

- **Asteroids** — ore locations and their contents (curated from game knowledge)
- **Decompositions** — refinery recipes (ore → minerals), derived from the extraction data
- **Boolean flags** — `isRawMaterial`, `isFound`, `isFinalProduct` per item (curated)
- **Cross-referenced types** — any TypeID that appears as a blueprint input/output
  but is absent from the API's `types.json` is included automatically (17 known cases)
- **Manually added blueprints** — some factories/recipes don't exist in the game
  client data and are added by hand, e.g. the **Build** factory (`typeId: 10000014`)
  with 32 blueprints of its own

---

## BP classification by primaryTypeID

Each blueprint in `industry_blueprints.json` has a `primaryTypeID` field. There's a pattern:

- **Blueprint** (factory recipe): `primaryTypeID` matches one of the **outputs** (e.g. BP 1100 → Cargo Grid II)
- **Decomposition** (refinery recipe): `primaryTypeID` matches one of the **inputs** (e.g. BP 1202 → Platinum-Palladium Matrix)

This could potentially replace the hardcoded facility-type distinction (factory vs refinery) in the future.

> TODO: Investigate whether we can classify facilities automatically based on their BPs' primaryTypeID vs inputs/outputs, eliminating the need to define factory/refinery roles explicitly.

---

## Session diary
This project uses OpenCode's `/cierrate` custom command to generate a per-session diary in `docs/sesiones/`. At the end of each working session, running `/cierrate` produces a narrative summary of what was done, decisions made, problems encountered, and pending TODOs.

---

## License

© tacombel@gmail.com

<!-- LAST_README_UPDATE: d2d28b1 (chore: add session notes and analysis files to .gitignore) — update this hash when you next edit the README so you know what range of changes to cover -->
