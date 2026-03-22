# EVE Frontier Industry Calculator

A tool to manage blueprints, calculate required materials, and track stock in EVE Frontier.

## Features

- **Items** — Catalogue of raw materials, intermediates, and final products
- **Blueprints** — Crafting recipes with direct material calculation
- **Packs** — Group multiple blueprints to calculate and execute in batch
- **Stock** — Inventory tracking with inline editing
- **Factories** — Production factory management
- **Decompositions** — Ore decomposition rules
- **Asteroids** — Asteroid type locations per ore

---

## Installation

### Option A — Local (Node.js)

**Requirements:** [Node.js](https://nodejs.org/) v18 or higher, npm, Git

#### 1. Clone the repository

```bash
git clone https://github.com/Tacombel/eve-frontier-blueprints.git
cd eve-frontier-blueprints
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Set up the database

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="change-this-to-a-random-secret"
```

Apply the migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

#### 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option B — Docker *(Soon)*

> Docker support is coming. A pre-built image for `linux/amd64` and `linux/arm64` will be available on Docker Hub.

---

## Game data

Game data (items, blueprints, decompositions, factories, asteroid types) is shared via this repository. Stock and packs are personal and stay local only.

### Sync the latest data

When new data is pushed to the repository, pull the changes:

```bash
git pull
```

Then open the app and go to **Admin**. You have two import options:

| Option | What it does |
|--------|-------------|
| **Merge import** | Adds or updates records from the shared dataset. Existing data not in the file is left untouched. Safe for day-to-day updates. |
| **Reset import** | Deletes **all** game data and replaces it with the shared dataset. Use this to fix inconsistencies or start clean. |

> Your stock and packs are never affected by either import.

### Contribute data

1. Fork the repository (or ask to be added as a collaborator)
2. Pull the latest changes: `git pull`
3. Make your changes in the app (add items, blueprints, etc.)
4. Go to **Admin → Export** to save the updated dataset
5. Commit and open a Pull Request:
   ```bash
   git add prisma/seed.json
   git commit -m "feat: add blueprints for XYZ"
   git push
   ```

---

## Tech stack

- [Next.js 14](https://nextjs.org/) — React framework with App Router
- [Prisma](https://www.prisma.io/) — ORM with SQLite
- [Tailwind CSS](https://tailwindcss.com/) — Styling

---

## License

© tacombel@gmail.com
