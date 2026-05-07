# AGENTS.md — Project notes for OpenCode

## ✅ Refactor completado: carga de JSON unificada

- `primaryTypeID` distingue BP (output) vs decomposition (input) — NO más datos curados de descomposición
- Refinerías detectadas automáticamente (facilities cuyos blueprints son descomposiciones)
- `maxInputRuns`/`maxOutputRuns` se incorporan desde `industry_facilities.json`
- `Decomposition` ahora usa `primaryTypeId`, `inputs[]` y `outputs[]` (formato espejo del juego)
- Solo lo curado (custom items, custom blueprints, flags, asteroids) está fuera de los JSON

## Dev server

```bash
# Start in background (survives shell timeout)
npx next dev > /tmp/nextdev.log 2>&1 &

# Check if responding
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

# View logs
tail -f /tmp/nextdev.log
```
