# EVE Frontier Industry Calculator

Herramienta para gestionar blueprints, calcular materiales y controlar stock en EVE Frontier.

## Características

- **Items** — Catálogo de materiales, intermedios y productos finales
- **Blueprints** — Recetas de fabricación con cálculo directo de materiales necesarios
- **Packs** — Agrupa varios blueprints para calcular y ejecutar en lote
- **Stock** — Control de inventario con edición directa
- **Factories** — Gestión de fábricas de producción
- **Decompositions** — Reglas de descomposición de minerales
- **Asteroids** — Localización de tipos de asteroide por mineral

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- npm (incluido con Node.js)
- Git

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Tacombel/eve-frontier-blueprints.git
cd eve-frontier-blueprints
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar la base de datos

Crea el fichero `.env` en la raíz del proyecto con el siguiente contenido:

```env
DATABASE_URL="file:./prisma/dev.db"
```

Después aplica las migraciones para crear la base de datos:

```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Arrancar la aplicación

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Uso básico

El flujo recomendado para empezar es:

1. **Items** → Crea todos los materiales, intermedios y productos que uses
2. **Asteroids** → (Opcional) Añade tipos de asteroide y sus ubicaciones
3. **Decompositions** → Define cómo se descomponen los minerales en materiales
4. **Factories** → Crea las fábricas que uses para fabricar
5. **Blueprints** → Define las recetas de fabricación para cada item
6. **Stock** → Registra el inventario que tienes actualmente
7. **Blueprints / Packs** → Usa el botón ⚡ Calculate para ver qué necesitas fabricar

---

## Stack técnico

- [Next.js 14](https://nextjs.org/) — Framework React con App Router
- [Prisma](https://www.prisma.io/) — ORM para base de datos SQLite
- [Tailwind CSS](https://tailwindcss.com/) — Estilos

---

## Licencia

© tacombel@gmail.com
