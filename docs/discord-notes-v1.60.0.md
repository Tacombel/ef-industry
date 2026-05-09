# EF Industry — Discord Update Notes (v1.53 → v1.60)

> Posted after v1.60.0 (commit 494654c). Last notes were for v1.52.1 (commit 3ac01a7).

---

## 📦 EF Industry — Update Notes (v1.53 → v1.60)

---

### 🔍 Browse Mode (no login required)
You can now explore the app **without connecting your wallet**.
- Search any character by name and check their SSUs and available materials
- Calculate blueprint collections as a guest
- Save temporary Collections locally while browsing

### ⚙️ Improved Optimizer
- **Auto-exclusion**: the optimizer re-runs the greedy algorithm excluding non-basic ores to find globally better solutions
- **Manual ore exclusion**: UI to exclude specific minerals from calculations, with warnings when a decomposition becomes unresolvable

### 📊 Game Data Update
- Fresh Phobos data imported: **30 recipe changes**, 2 new facility assignments
- BP 1480/1481 outputs corrected (3→6, aligned with Phobos data)

### 🛡️ Admin Panel
- Persistent incident log with DB table, API and admin UI
- New analytics block for anonymous Browse: sessions, SSU views, collection calculations and login conversions — full funnel + daily breakdown table

### 🔧 Quality & Stability
- Unified BP and decomposition format (`primaryTypeId` + `inputs/outputs` arrays)
- Status endpoint never returns 500 even if internal services fail
- Layout fixes, consistent container widths, dead code cleanup

---

> **v1.52.1 → v1.60.0** · 30 commits · 46 tests ✅
