"use client";

import { useEffect, useState, useCallback } from "react";
import CollectionCalculation from "@/components/collections/CollectionCalculation";
import ImportCollectionModal from "@/components/collections/ImportCollectionModal";
import SsuSelector from "@/components/common/SsuSelector";
import { useSsuList } from "@/hooks/useSsuList";
import { useSsuIgnored } from "@/hooks/useSsuIgnored";
import { useSession } from "@/hooks/useSession";

interface Item { id: string; name: string; isRawMaterial: boolean; isFound: boolean; blueprints: { factory: string }[] }
interface CollectionItem { id: string; itemId: string; quantity: number; item: Item }
interface Collection { id: string; name: string; description?: string; items: CollectionItem[] }

const emptyRow = () => ({ itemId: "", quantity: 1 });
const GUEST_COLLECTIONS_KEY = "ef-guest-tab-collections";

type GuestCollectionRaw = { id: string; name: string; description?: string; items: { itemId: string; quantity: number }[] };

function loadGuestRaw(): GuestCollectionRaw[] {
  try { return JSON.parse(localStorage.getItem(GUEST_COLLECTIONS_KEY) ?? "[]"); } catch { return []; }
}
function saveGuestRaw(cols: GuestCollectionRaw[]) {
  localStorage.setItem(GUEST_COLLECTIONS_KEY, JSON.stringify(cols));
}

export default function CollectionsTab({ guestCharacterId }: { guestCharacterId?: string }) {
  const isGuest = !!guestCharacterId;
  const { ssus } = useSsuList(guestCharacterId);
  const { ignoredSet, toggleIgnored, activeSsuAddresses } = useSsuIgnored();
  const ssuAddresses = activeSsuAddresses(ssus);
  const { isLoggedIn: isServerLoggedIn } = useSession();
  const isLoggedIn = isServerLoggedIn || isGuest;
  const [collections, setCollections] = useState<Collection[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [calcCollectionId, setCalcCollectionId] = useState<string | null>(null);
  const [collectionsCount, setCollectionsCount] = useState(1);
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    if (isGuest) {
      const itemRes = await fetch("/api/items");
      const allItems: Item[] = itemRes.ok ? await itemRes.json() : [];
      const itemMap = new Map(allItems.map((i) => [i.id, i]));
      const raw = loadGuestRaw();
      setCollections(raw.map((c) => ({
        ...c,
        items: c.items.map((r, idx) => ({
          id: `${c.id}-${idx}`,
          itemId: r.itemId,
          quantity: r.quantity,
          item: itemMap.get(r.itemId) ?? { id: r.itemId, name: r.itemId, isRawMaterial: false, isFound: false, blueprints: [] },
        })),
      })));
      setItems(allItems);
    } else {
      const [collectionRes, itemRes] = await Promise.all([fetch("/api/collections"), fetch("/api/items")]);
      setCollections(collectionRes.ok ? await collectionRes.json() : []);
      setItems(itemRes.ok ? await itemRes.json() : []);
    }
    setLoading(false);
  }, [isGuest]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditId(null); setName(""); setDescription(""); setRows([emptyRow()]); setError("");
    setShowForm(true);
  }

  function openEdit(collection: Collection) {
    setEditId(collection.id);
    setName(collection.name);
    setDescription(collection.description ?? "");
    setRows(collection.items.map((i) => ({ itemId: i.itemId, quantity: i.quantity })));
    setError(""); setShowForm(true);
  }

  function addRow() { setRows([...rows, emptyRow()]); }
  function removeRow(idx: number) { setRows(rows.filter((_, i) => i !== idx)); }
  function updateRow(idx: number, field: "itemId" | "quantity", value: string | number) {
    setRows(rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  async function save() {
    if (!name.trim()) { setError("Name is required"); return; }
    if (rows.some((r) => !r.itemId)) { setError("All rows need an item"); return; }
    setSaving(true);
    try {
      if (isGuest) {
        const raw = loadGuestRaw();
        if (editId) {
          const idx = raw.findIndex((c) => c.id === editId);
          if (idx >= 0) raw[idx] = { id: editId, name, description, items: rows };
        } else {
          raw.push({ id: crypto.randomUUID(), name, description, items: rows });
        }
        saveGuestRaw(raw);
        setShowForm(false);
        load();
        return;
      }
      const url = editId ? `/api/collections/${editId}` : "/api/collections";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, items: rows }),
      });
      if (!res.ok) {
        let msg = "Error";
        try { msg = (await res.json()).error ?? msg; } catch {}
        setError(msg);
        return;
      }
      setShowForm(false);
      load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, collectionName: string) {
    if (!confirm(`Delete collection "${collectionName}"?`)) return;
    if (isGuest) {
      saveGuestRaw(loadGuestRaw().filter((c) => c.id !== id));
      load();
      return;
    }
    await fetch(`/api/collections/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-100">Production Collections</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="btn-sm btn-secondary"
            title="Refresh SSU stocks"
          >
            ↻ Refresh stock
          </button>
          {isLoggedIn ? (
            <>
              <button onClick={() => setShowImport(true)} className="btn-sm btn-secondary">↑ Import fit</button>
              <button onClick={openNew} className="btn-primary">+ New Collection</button>
            </>
          ) : (
            <p className="text-sm text-yellow-400">🔐 You need to <a href="/login" className="underline hover:text-yellow-300">log in</a> to save collections.</p>
          )}
        </div>
      </div>


      <SsuSelector ssus={ssus} ignoredSet={ignoredSet} toggleIgnored={toggleIgnored} />

      {/* Search */}
      <div className="relative flex-1 max-w-xs mb-4 mt-4">
        <input
          placeholder="Search collections…"
          className="input w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">✕</button>}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : collections.length === 0 ? (
        <p className="text-gray-500">No collections yet.</p>
      ) : (
        (() => {
          const filtered = collections.filter((collection) => {
            if (search && !collection.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (calcCollectionId && collection.id !== calcCollectionId) return false;
            return true;
          });
          return (
        <div className="space-y-4">
          {filtered.length === 0 && search && (
            <p className="text-gray-500">No collections match &quot;{search}&quot;.</p>
          )}
          {filtered.map((collection) => (
            <div key={collection.id} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div>
                    <h3 className="font-semibold text-gray-100">{collection.name}</h3>
                    {collection.description && <p className="text-sm text-gray-500 mt-0.5">{collection.description}</p>}
                  </div>
                  {calcCollectionId === collection.id && (
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                      <span>Collections:</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className="input w-16 text-right py-0.5 text-xs"
                        value={collectionsCount}
                        onChange={(e) => setCollectionsCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                      />
                    </label>
                  )}
                </div>
                {(() => {
                    const missing = collection.items.filter((pi) => !pi.item.isRawMaterial && !pi.item.isFound && pi.item.blueprints.length === 0);
                    return missing.length > 0 ? (
                      <div className="flex items-center gap-1.5 rounded bg-yellow-900/30 border border-yellow-700/50 px-2 py-1 text-xs text-yellow-400">
                        <span>⚠</span>
                        <span>No blueprint: {missing.map((pi) => pi.item.name).join(", ")}</span>
                      </div>
                    ) : null;
                  })()}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => { setCalcCollectionId(calcCollectionId === collection.id ? null : collection.id); setCollectionsCount(1); }}
                    className={`btn-sm ${calcCollectionId === collection.id ? "btn-primary" : ""}`}
                  >
                    {calcCollectionId === collection.id ? "Hide Calc" : "Calculate"}
                  </button>
                  <button onClick={() => openEdit(collection)} className="btn-sm">Edit</button>
                  <button onClick={() => remove(collection.id, collection.name)} className="btn-sm btn-danger">Del</button>
                </div>
              </div>

              {calcCollectionId === collection.id && <CollectionCalculation collectionId={collection.id} refreshKey={refreshKey} ssuAddresses={ssuAddresses} collectionsCount={collectionsCount} />}
            </div>
          ))}
        </div>
          );
        })()
      )}

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editId ? "Edit Collection" : "New Collection"}</h2>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <label className="block mb-3">
              <span className="label">Collection Name</span>
              <input className="input w-full mt-1" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </label>

            <label className="block mb-4">
              <span className="label">Description (optional)</span>
              <input className="input w-full mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>

            <div className="mb-2">
              <span className="label">Items to produce</span>
              <div className="space-y-2 mt-2">
                {rows.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      className="input flex-1"
                      value={row.itemId}
                      onChange={(e) => updateRow(idx, "itemId", e.target.value)}
                    >
                      <option value="">Select item…</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                    <input
                      type="number" min={1}
                      className="input w-20"
                      value={row.quantity}
                      onChange={(e) => updateRow(idx, "quantity", Number(e.target.value))}
                    />
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-gray-600 hover:text-red-400 px-1"
                      disabled={rows.length === 1}
                    >✕</button>
                  </div>
                ))}
              </div>
              <button onClick={addRow} className="btn-ghost text-xs mt-2">+ Add item</button>
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <ImportCollectionModal
          items={items}
          onClose={() => setShowImport(false)}
          onImported={load}
        />
      )}
    </div>
  );
}
