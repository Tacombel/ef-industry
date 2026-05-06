# Diferencias Phobos vs EF-static

**Fecha:** 2026-05-06
**Origen:** Phobos (ProtoDroidBot fork `fsdbinary-t1`)
**Comando:** `python run.py -e "C:\\CCP\\EVE Frontier" -s stillness -j "3261522-stillness-e6c5_t1" -l "industry_blueprints,industry_facilities"`

---

## Facilities

| Facility typeId | Cambio | Detalle |
|---|---|---|
| 87162 (Field Printer) | +BP 1100 | maxIn=8, maxOut=1 | ✅ RECETA CORRECTA |
| 88067 (Printer) | +BP 1062 | maxIn=34, maxOut=62 | ✅ RECETA CORRECTA |

## Blueprints

| Blueprint | Tipo | Detalle |
|---|---|---|
| BP 1010 (AC Gyrojet Ammo 1 (S) ) | MODIFICADO | runTime: 3 → 6 | ✅ CORRECTO |
| BP 1013 (Compressed Coolant ) | MODIFICADO | runTime: 3 → 10 | ✅ CORRECTO |
| BP 1029 (Rapid Plasma Ammo 1 (S)) | MODIFICADO | runTime: 5 → 15 | inputs: [400x Platinum-Group Veins , 400x Troilite Sulfide Grains] → [360x Platinum-Group Veins , 360x Troilite Sulfide Grains] | ✅ CORRECTO |
| BP 1030 (Coilgun Ammo 1 (S)) | MODIFICADO | runTime: 5 → 10 | ✅ CORRECTO |
| BP 1033 (SOF-80 Fuel) | MODIFICADO | runTime: 35 → 55 | ✅ CORRECTO |
| BP 1034 (EM Disintegrator Charge (M)) | MODIFICADO | runTime: 3 → 10 | ✅ CORRECTO |
| BP 1051 (AC Gyrojet Ammo 3 (S)) | MODIFICADO | runTime: 5 → 10 | ✅ CORRECTO |
| BP 1052 (Rapid Plasma Ammo 2 (S)) | MODIFICADO | runTime: 5 → 15 | inputs: [400x Platinum-Group Veins , 400x Troilite Sulfide Grains] → [360x Platinum-Group Veins , 360x Troilite Sulfide Grains] | ✅ CORRECTO |
| BP 1053 (AC Gyrojet Ammo 2 (S)) | MODIFICADO | runTime: 5 → 10 | ✅ CORRECTO |
| BP 1054 (EM Disintegrator Charge (S)) | MODIFICADO | runTime: 3 → 8 | ✅ CORRECTO |
| BP 1056 (EU-90 Fuel) | MODIFICADO | runTime: 35 → 55 | ✅ CORRECTO |
| BP 1063 (Howitzer Ammo 1 (M)) | MODIFICADO | runTime: 13 → 25 | ✅ CORRECTO |
| BP 1064 (EM Disintegrator Charge (M)) | MODIFICADO | runTime: 3 → 10 | ✅ CORRECTO |
| BP 1181 (Water Ice) | MODIFICADO | runTime: 3 → 8 | ✅ CORRECTO |
| BP 1191 (Eupraxite) | MODIFICADO | runTime: 18 → 25 | ✅ CORRECTO |
| BP 1193 (Sophrogon) | MODIFICADO | runTime: 18 → 25 | ✅ CORRECTO |
| BP 1202 (Platinum-Palladium Matrix) | MODIFICADO | outputs: [10x Silica Grains, 30x Iron-Rich Nodules, 8x Palladium] → [16x Silica Grains, 30x Iron-Rich Nodules, 8x Palladium] | ✅ CORRECTO |
| BP 1203 (Hydrated Sulfide Matrix) | MODIFICADO | outputs: [20x Hydrocarbon Residue, 200x Water Ice] → [20x Hydrocarbon Residue, 300x Water Ice] | ✅ CORRECTO |
| BP 1212 (Iron-Rich Nodules) | MODIFICADO | outputs: [60x Platinum-Group Veins , 594x Nickel-Iron Veins] → [120x Platinum-Group Veins , 1188x Nickel-Iron Veins] | ✅ CORRECTO |
| BP 1221 (Platinum-Palladium Matrix) | MODIFICADO | outputs: [30x Silica Grains, 90x Iron-Rich Nodules, 24x Palladium] → [48x Silica Grains, 90x Iron-Rich Nodules, 24x Palladium] | ✅ CORRECTO |
| BP 1222 (Hydrated Sulfide Matrix) | MODIFICADO | outputs: [60x Hydrocarbon Residue, 600x Water Ice] → [60x Hydrocarbon Residue, 900x Water Ice] | ✅ CORRECTO |
| BP 1229 (MCF) | MODIFICADO | runTime: 79200 → 59126 | inputs: [1x Exterminata Protocol Frame, 88x Batched Reinforced Alloys, 48x Batched Carbon Weave, 48x Batched Thermal Composites, 3x Still Kernel] → [1x Exterminata Protocol Frame, 123x Batched Reinforced Alloys, 67x Batched Carbon Weave, 67x Batched Thermal Composites, 4x Still Kernel] | ✅ CORRECTO |
| BP 1230 (TADES) | MODIFICADO | runTime: 151200 → 99136 | inputs: [1x Apocalypse Protocol Frame, 124x Batched Reinforced Alloys, 72x Batched Carbon Weave, 72x Batched Thermal Composites, 4x Still Kernel] → [1x Apocalypse Protocol Frame, 211x Batched Reinforced Alloys, 123x Batched Carbon Weave, 123x Batched Thermal Composites, 7x Still Kernel] | ✅ CORRECTO |
| BP 1231 (HAF) | MODIFICADO | runTime: 82800 → 72472 | inputs: [1x Exterminata Protocol Frame, 160x Batched Reinforced Alloys, 74x Batched Carbon Weave, 74x Batched Thermal Composites] → [1x Exterminata Protocol Frame, 181x Batched Reinforced Alloys, 84x Batched Carbon Weave, 83x Batched Thermal Composites] | ✅ CORRECTO |
| BP 1233 (MAUL) | MODIFICADO | runTime: 244800 → 230063 | inputs: [1x Apocalypse Protocol Frame, 46x Packaged Reinforced Alloys, 30x Packaged Carbon Weave, 30x Packaged Thermal Composites, 7x Echo Chamber, 2x Still Knot] → [1x Apocalypse Protocol Frame, 49x Packaged Reinforced Alloys, 32x Packaged Carbon Weave, 31x Packaged Thermal Composites, 7x Echo Chamber, 2x Still Knot] | ✅ CORRECTO |
| BP 1480 (Fine Young Crude Matter) | MODIFICADO | primaryTypeID: Eupraxite → Fine Young Crude Matter | outputs: [3x Eupraxite, 26x Brine] → [6x Eupraxite, 26x Brine] | ✅ CORRECTO |
| BP 1481 (Fine Old Crude Matter) | MODIFICADO | primaryTypeID: Sophrogon → Fine Old Crude Matter | outputs: [3x Sophrogon, 26x Brine] → [6x Sophrogon, 26x Brine] | ✅ CORRECTO |
| BP 1482 (Still Kernel) | MODIFICADO | inputs: [50x Brine, 5x Tholin Nodules] → [50x Brine, 1x Aromatic Carbon Weave] | ✅ CORRECTO |
| BP 1483 (LAI) | MODIFICADO | runTime: 78000 → 62228 | inputs: [1x Exterminata Protocol Frame, 80x Batched Reinforced Alloys, 70x Batched Carbon Weave, 70x Batched Thermal Composites, 4x Still Kernel] → [1x Exterminata Protocol Frame, 101x Batched Reinforced Alloys, 89x Batched Carbon Weave, 88x Batched Thermal Composites, 5x Still Kernel] | ✅ CORRECTO |

## TypeIDs no cubiertos por types.json

**17 TypeIDs** referenciados en los nuevos ficheros pero ausentes de `EF-static/types.json`:

- 83524
- 83775
- 89978
- 89979
- 89980
- 89981
- 89982
- 89983
- 89984
- 89985
- 89986
- 89987
- 89988
- 89989
- 91749
- 91967
- 91968

✅ Todos los TypeIDs faltantes ya están contemplados en `custom-items.json`.

