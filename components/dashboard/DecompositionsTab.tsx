"use client";

import { useEffect, useState, useCallback } from "react";
import SsuAddressBar from "@/components/common/SsuAddressBar";
import { useSsuAddress } from "@/hooks/useSsuAddress";

interface Item { id: string; name: string }
interface Refinery { id: string; name: string }
interface DecompositionOutput { id: string; itemId: string; quantity: number; item: Item }
interface Decomposition {
  id: string;
  refinery: string;
  inputQty: number;
  isDefault: boolean;
  sourceItem: Item;
  outputs: DecompositionOutput[];
}

export default function DecompositionsTab() {
  const { address: ssuAddress, saveAddress } = useSsuAddress();
  const [decompositions, setDecompositions] = useState<Decomposition[]>([]);
  const [refineries, setRefineries] = useState<Refinery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRefinery, setFilterRefinery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [decRes, refRes] = await Promise.all([
      fetch("/api/decompositions"),
      fetch("/api/refineries"),
    ]);
    setDecompositions(decRes.ok ? await decRes.json() : []);
    setRefineries(refRes.ok ? await refRes.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setDefault(id: string) {
    await fetch(`/api/decompositions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    load();
  }

  // Group decompositions by source item
  const grouped = decompositions.reduce((acc, d) => {
    const key = d.sourceItem.id;
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)!.push(d);
    return acc;
  }, new Map<string, Decomposition[]>());

  const filteredGrouped = Array.from(grouped.entries()).filter(([, entries]) => {
    if (filterRefinery && !entries.some((d) => d.refinery === filterRefinery)) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return entries[0].sourceItem.name.toLowerCase().includes(q) ||
      entries.some((d) => d.outputs.some((o) => o.item.name.toLowerCase().includes(q)));
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-gray-100">Decompositions</h2>
      </div>
      <p className="text-sm text-gray-500 mb-3">
        Material decomposition rates when reprocessed.
      </p>
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <input
            placeholder="Search by input or output…"
            className="input w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">✕</button>}
        </div>
        <select
          className="input w-48"
          value={filterRefinery}
          onChange={(e) => setFilterRefinery(e.target.value)}
        >
          <option value="">All refineries</option>
          {refineries.map((r) => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* SSU Address Bar */}
      <div className="mb-6">
        <SsuAddressBar
          address={ssuAddress}
          onSave={saveAddress}
          onRefresh={() => {}}
        />
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : grouped.size === 0 ? (
        <p className="text-gray-500">No decompositions available.</p>
      ) : (
        <div className="space-y-3">
          {filteredGrouped.length === 0 && (
            <p className="text-gray-500">No decompositions match &quot;{search}&quot;.</p>
          )}
          {filteredGrouped.map(([, entries]) => (
            <div key={entries[0].sourceItem.id} className="rounded-lg border border-gray-800 bg-gray-900">
              <div className="px-4 py-3 border-b border-gray-800">
                <span className="font-semibold text-gray-100">{entries[0].sourceItem.name}</span>
                <span className="ml-2 text-xs text-gray-600">{entries.length} decomposition{entries.length > 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-gray-800/50">
                {entries.map((d) => (
                  <div key={d.id} className="px-4 py-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => !d.isDefault && setDefault(d.id)}
                        title={d.isDefault ? "Default decomposition" : "Set as default"}
                        className={`text-base leading-none ${d.isDefault ? "text-yellow-400" : "text-gray-700 hover:text-yellow-600"}`}
                      >
                        ★
                      </button>
                      {d.refinery ? <span className="badge badge-blue">{d.refinery}</span> : <span className="text-gray-600 italic text-xs">No refinery</span>}
                      <span className="text-sm text-gray-300">
                        <span className="text-yellow-400">{d.inputQty}×</span> {entries[0].sourceItem.name}
                      </span>
                      <span className="text-gray-600">→</span>
                      <div className="flex flex-wrap gap-1">
                        {d.outputs.map((o) => (
                          <span key={o.id} className="text-xs bg-gray-800 rounded px-2 py-1 text-gray-300">
                            {o.item.name} <span className="text-yellow-400">×{o.quantity}</span>
                          </span>
                        ))}
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        {d.isDefault && <span className="badge badge-yellow text-xs">Default</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
