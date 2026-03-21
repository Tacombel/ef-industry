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

## Requirements

- [Node.js](https://nodejs.org/) v18 or higher
- npm (included with Node.js)
- Git

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Tacombel/eve-frontier-blueprints.git
cd eve-frontier-blueprints
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

Create a `.env` file in the project root with the following content:

```env
DATABASE_URL="file:./prisma/dev.db"
```

Apply the migrations to create the database structure, then load the shared game data:

```bash
npx prisma migrate deploy
npx prisma generate
npm run db:seed
```

### 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Recommended workflow

1. **Items** → Create all materials, intermediates, and products you use
2. **Asteroids** → (Optional) Add asteroid types and their locations
3. **Decompositions** → Define how ores break down into materials
4. **Factories** → Add the factories you use for crafting
5. **Blueprints** → Define crafting recipes for each item
6. **Stock** → Enter your current inventory
7. **Blueprints / Packs** → Use the ⚡ Calculate button to see what you need to craft

---

## Collaborative data

Game data (items, blueprints, decompositions, factories, asteroid types) is stored in [`prisma/seed.json`](prisma/seed.json) and shared via this repository. Stock and packs are personal and stay local only.

### Sync the latest data from GitHub

When someone pushes new data to `seed.json`, pull and reload your local database:

```bash
git pull
npm run db:seed
```

> **Warning:** this resets all game data and reloads from `seed.json`. Your stock is preserved.

### Contribute data

1. Fork the repository (or ask to be added as a collaborator)
2. Pull the latest changes: `git pull`
3. Make your changes in the app (add items, blueprints, etc.)
4. Export your database to `seed.json`:
   ```bash
   npm run db:export
   ```
5. Review the changes in `prisma/seed.json`
6. Commit and open a Pull Request:
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
