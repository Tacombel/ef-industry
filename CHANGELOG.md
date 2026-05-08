# Changelog

## v1.55.1 — 2026-05-07

- Removed dead `description`, `mass`, `radius`, `portionSize`, `groupName`, `groupId`, `categoryName`, `categoryId`, `iconUrl` fields from Item model and entire pipeline
- Removed dead `createdAt`/`updatedAt` from Item model
- Removed dead API endpoints: `POST /api/items`, `PUT /api/items/[id]`, `DELETE /api/items/[id]`, `GET /api/item-map`
- Removed dead component: `SsuAddressBar`
- Removed dead hook: `useSsuIgnore`
- Removed dead script: `prisma/export.ts`
- Fixed profile page password change being restricted to ADMIN only (now any authenticated user)

## v1.55.0 — 2026-05-07

- Unified BP and decomposition formats: both use `primaryTypeId`, `inputs[]`, `outputs[]` (mirroring game data)
- Decompositions now derived automatically from `industry_blueprints.json` via `primaryTypeID` classification — removed curated `decompositions.json`
- Refineries auto-detected from facilities whose blueprints are decompositions
- Added `DecompositionInput` model with `inputs` relation (mirrors `BlueprintInput`)
- Added `primaryTypeId` field to `Decomposition` model
- Updated `custom-blueprints.json` to new unified format
