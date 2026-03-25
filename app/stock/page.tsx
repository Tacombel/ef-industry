"use client";

import { useEffect, useState, useCallback } from "react";

interface StockItem {
  id: string;
  name: string;
  isRawMaterial: boolean;
  isFound: boolean;
  isFinalProduct: boolean;
  quantity: number;
}

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [pending, setPending] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [filter, setFilter] = useState<"all" | "ore" | "raw" | "crafted">("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/stock");
    const data: StockItem[] = await res.json();
    setItems(data);
    const initial: Record<string, number> = {};
    data.forEach((i) => { initial[i.id] = i.quantity; });
    setPending(initial);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(itemId: string) {
    setSaving((s) => ({ ...s, [itemId]: true }));
    await fetch(`/api/stock/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: pending[itemId] ?? 0 }),
    });
    setSaving((s) => ({ ...s, [itemId]: false }));
    // Update local state
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, quantity: pending[itemId] } : i));
  }

  async function resetAll() {
    if (!confirm("Set all stock quantities to 0?")) return;
    setResetting(true);
    await fetch("/api/stock/reset", { method: "POST" });
    await load();
    setResetting(false);
  }

  function handleKey(e: React.KeyboardEvent, itemId: string) {
    if (e.key === "Enter") save(itemId);
  }

  const filtered = items.filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    if (filter === "ore") return i.isRawMaterial && matchesSearch;
    if (filter === "raw") return i.isFound && matchesSearch;
    if (filter === "crafted") return !i.isRawMaterial && !i.isFound && matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Stock</h1>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost text-sm">↺ Refresh</button>
          <button onClick={resetAll} disabled={resetting} className="btn-sm btn-danger text-sm">
            {resetting ? "…" : "Reset to 0"}
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <input
            className="input w-full"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">✕</button>}
        </div>
        <div className="flex gap-1">
          {(["all", "ore", "raw", "crafted"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`}
            >
              {f === "all" ? "All" : f === "ore" ? "Ore" : f === "raw" ? "Raw" : "Crafted"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No items found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-800">
              <th className="pb-2 pr-4">Item</th>
              <th className="pb-2 pr-4">Type</th>
              <th className="pb-2 pr-4 w-32">Quantity</th>
              <th className="pb-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const changed = pending[item.id] !== item.quantity;
              return (
                <tr key={item.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 pr-4 font-medium text-gray-100">{item.name}</td>
                  <td className="py-2 pr-4">
                    {item.isRawMaterial
                      ? <span className="badge badge-yellow">Ore</span>
                      : item.isFound
                      ? <span className="badge badge-blue">Raw</span>
                      : item.isFinalProduct
                      ? <span className="badge badge-cyan">Final</span>
                      : <span className="badge badge-blue">Crafted</span>}
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="number"
                      min={0}
                      className={`input w-28 ${changed ? "border-cyan-600" : ""}`}
                      value={pending[item.id] ?? 0}
                      onChange={(e) => setPending((p) => ({ ...p, [item.id]: Number(e.target.value) }))}
                      onKeyDown={(e) => handleKey(e, item.id)}
                    />
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => save(item.id)}
                      disabled={saving[item.id] || !changed}
                      className={`btn-sm ${changed ? "btn-primary" : "opacity-30"}`}
                    >
                      {saving[item.id] ? "…" : "Save"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
