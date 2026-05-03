# EVE Frontier Industry Calculator

A tool to manage blueprints, calculate required materials, and track stock in EVE Frontier.

## Features

- **Items** — Catalogue of raw materials, intermediates, and final products
- **Blueprints** — Crafting recipes with direct material calculation; items craftable in multiple facilities show all factory badges — clicking one switches the recipe and recalculates; hover any badge to see the full recipe (inputs, outputs, batch size)
- **Collections** — Group multiple blueprints to calculate and execute in batch
- **Stock** — Inventory tracking with inline editing
- **Factories** — Production factory management
- **Decompositions** — Ore decomposition rules, including two-level found-item chains; each decomposition row shows the refinery badge (amber for found items, purple for ores); selectable refinery per ore with recipe tooltip on hover
- **Asteroids** — Asteroid type locations per ore

---

## Installation

### Option A — Local (Node.js)

**Requirements:** [Node.js](https://nodejs.org/) v18 or higher, npm, Git

#### 1. Clone the repository

```bash
git clone https://github.com/Tacombel/ef-industry.git
cd ef-industry
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

#### 4. Build and start the app

```bash
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option B — Docker

> Deploy via Docker using `docker-compose up --build -d`. Requires cloning the repo on the server first.

---

## Tech stack

- [Next.js 14](https://nextjs.org/) — React framework with App Router
- [Prisma](https://www.prisma.io/) — ORM with SQLite
- [Tailwind CSS](https://tailwindcss.com/) — Styling

---

## License

© tacombel@gmail.com
