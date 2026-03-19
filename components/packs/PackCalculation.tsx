"use client";

import { useCallback, useEffect, useState } from "react";
import type { AsteroidInfo, CalculationResult } from "@/lib/calculator";

function AsteroidTooltip({ asteroids }: { asteroids: AsteroidInfo[] }) {
  if (asteroids.length === 0) return null;
  return (
    <div className="absolute z-50 left-0 top-full mt-1 w-56 rounded border border-gray-700 bg-gray-900 shadow-lg p-2 text-xs pointer-events-none">
      {asteroids.map((a) => (
        <div key={a.name} className="mb-1 last:mb-0">
          <span className="text-cyan-300 font-medium">{a.name}</span>
          {a.locations.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {a.locations.map((l) => (
                <span key={l} className="badge badge-blue">{l}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PackCalculation({ packId }: { packId: string }) {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  // pending stock edits: itemId -> value
  const [stock, setStock] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback((isReload = false) => {
    if (isReload) setRecalculating(true);
    else setLoading(true);
    setError("");
    fetch(`/api/packs/${packId}/calculate`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setResult(data);
          // Seed inputs with actual stock quantities
          const seeded: Record<string, number> = {};
          for (const row of [...data.rawMaterials, ...data.intermediates, ...(data.finalProducts ?? [])]) {
            seeded[row.itemId] = row.actualStock;
          }
          for (const d of data.decompositions ?? []) {
            seeded[d.sourceItemId] = d.actualStock;
          }
          setStock(seeded);
        }
        setLoading(false);
        setRecalculating(false);
      })
      .catch(() => {
        setError("Failed to calculate");
        setLoading(false);
        setRecalculating(false);
      });
  }, [packId]);

  useEffect(() => { load(); }, [load]);

  async function saveAll() {
    if (!result) return;
    setSaving(true);
    const allRows = [
      ...result.rawMaterials,
      ...result.intermediates,
      ...(result.finalProducts ?? []),
      ...(result.decompositions ?? []).map((d) => ({ itemId: d.sourceItemId, actualStock: d.actualStock })),
    ];
    await Promise.all(
      allRows.map((row) =>
        fetch(`/api/stock/${row.itemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: stock[row.itemId] ?? row.actualStock }),
        })
      )
    );
    setSaving(false);
    load(true);
  }

  const allStockRows = result
    ? [
        ...result.rawMaterials,
        ...result.intermediates,
        ...(result.finalProducts ?? []),
        ...(result.decompositions ?? []).map((d) => ({ itemId: d.sourceItemId, actualStock: d.actualStock })),
      ]
    : [];
  const hasChanges = allStockRows.some(
    (row) => (stock[row.itemId] ?? row.actualStock) !== row.actualStock
  );

  if (loading) return <p className="text-gray-500 text-sm">Calculating…</p>;
  if (error) return <p className="text-red-400 text-sm">Error: {error}</p>;
  if (!result) return null;

  const isRecalculating = recalculating;
  const stockSufficient =
    result.intermediates.length === 0 &&
    result.rawMaterials.every((r) => r.toBuy === 0) &&
    (result.decompositions ?? []).length === 0;

  return (
    <div className={`mt-3 space-y-4 border-t border-gray-800 pt-4 ${isRecalculating ? "opacity-60" : ""}`}>
      {stockSufficient && (
        <div className="flex items-center gap-2 rounded-md bg-green-900/30 border border-green-800 px-3 py-2">
          <span className="text-green-400 text-base">✓</span>
          <span className="text-green-300 text-sm font-medium">Stock suficiente</span>
        </div>
      )}
      {/* Final products stock */}
      {(result.finalProducts ?? []).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-cyan-300 mb-2">Final Products</h3>
          <table className="w-full table-fixed text-xs">
            <colgroup>
              <col />
              <col className="w-20" />
              <col className="w-28" />
              <col className="w-24" />
            </colgroup>
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left pb-1 pr-4">Item</th>
                <th className="text-right pb-1 pr-4">Needed</th>
                <th className="text-right pb-1 pr-4">Stock</th>
                <th className="text-right pb-1"></th>
              </tr>
            </thead>
            <tbody>
              {result.finalProducts.map((row) => (
                <tr key={row.itemId} className="border-b border-gray-800/40">
                  <td className="py-1 pr-4 text-gray-200">{row.itemName}</td>
                  <td className="py-1 pr-4 text-right text-gray-400">{row.quantityNeeded}</td>
                  <td className="py-1 pr-4 text-right">
                    <input
                      type="number"
                      min={0}
                      className={`input w-24 text-right py-0.5 text-xs ${
                        (stock[row.itemId] ?? row.actualStock) !== row.actualStock ? "border-cyan-600" : ""
                      }`}
                      value={stock[row.itemId] ?? row.actualStock}
                      onChange={(e) => setStock((s) => ({ ...s, [row.itemId]: Number(e.target.value) }))}
                    />
                  </td>
                  <td className="py-1 text-right text-gray-600 text-xs">in stock</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Intermediates + Raw materials — same 4-column layout for alignment */}
      {result.intermediates.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-cyan-400 mb-2">Intermediate Items to Craft</h3>
          <table className="w-full table-fixed text-xs">
            <colgroup>
              <col />
              <col className="w-20" />
              <col className="w-28" />
              <col className="w-24" />
            </colgroup>
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left pb-1 pr-4">Item</th>
                <th className="text-right pb-1 pr-4">Needed</th>
                <th className="text-right pb-1 pr-4">Stock</th>
                <th className="text-right pb-1">To Craft (runs)</th>
              </tr>
            </thead>
            <tbody>
              {result.intermediates.map((row) => (
                <tr key={row.itemId} className={`border-b border-gray-800/40 ${row.toProduce === 0 ? "opacity-50" : ""}`}>
                  <td className={`py-1 pr-4 ${row.toProduce === 0 ? "text-gray-400" : "text-gray-200"}`}>
                    <span>{row.itemName}</span>
                    {row.factory && <span className="badge badge-blue ml-1.5">{row.factory}</span>}
                  </td>
                  <td className="py-1 pr-4 text-right text-gray-400">{row.totalNeeded}</td>
                  <td className="py-1 pr-4 text-right">
                    <input
                      type="number"
                      min={0}
                      className={`input w-24 text-right py-0.5 text-xs ${
                        (stock[row.itemId] ?? row.actualStock) !== row.actualStock ? "border-cyan-600" : ""
                      }`}
                      value={stock[row.itemId] ?? row.actualStock}
                      onChange={(e) => setStock((s) => ({ ...s, [row.itemId]: Number(e.target.value) }))}
                    />
                  </td>
                  <td className="py-1 text-right font-semibold">
                    {row.toProduce === 0
                      ? <span className="text-green-400">✓</span>
                      : <span className="text-yellow-400">{row.toProduce} <span className="text-cyan-400">({row.blueprintRuns}×)</span></span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Raw materials */}
      {result.rawMaterials.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-yellow-400 mb-2">Raw Materials Needed</h3>
          <table className="w-full table-fixed text-xs">
            <colgroup>
              <col />
              <col className="w-20" />
              <col className="w-28" />
              <col className="w-24" />
            </colgroup>
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left pb-1 pr-4">Material</th>
                <th className="text-right pb-1 pr-4">Needed</th>
                <th className="text-right pb-1 pr-4">Stock</th>
                <th className="text-right pb-1">To Buy/Mine</th>
              </tr>
            </thead>
            <tbody>
              {result.rawMaterials.map((row) => (
                <tr key={row.itemId} className="border-b border-gray-800/40">
                  <td className="py-1 pr-4 text-gray-200">{row.itemName}</td>
                  <td className="py-1 pr-4 text-right text-gray-400">{row.totalNeeded}</td>
                  <td className="py-1 pr-4 text-right">
                    <input
                      type="number"
                      min={0}
                      className={`input w-24 text-right py-0.5 text-xs ${
                        (stock[row.itemId] ?? row.actualStock) !== row.actualStock ? "border-cyan-600" : ""
                      }`}
                      value={stock[row.itemId] ?? row.actualStock}
                      onChange={(e) => setStock((s) => ({ ...s, [row.itemId]: Number(e.target.value) }))}
                    />
                  </td>
                  <td className={`py-1 text-right font-semibold ${row.toBuy > 0 ? "text-red-400" : "text-green-400"}`}>
                    {row.toBuy > 0 ? row.toBuy : "✓"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Decompositions */}
      {(result.decompositions ?? []).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-purple-400 mb-2">Ore to Decompose</h3>
          <div className="space-y-2">
            {result.decompositions.map((d) => (
              <div key={d.sourceItemId} className="rounded border border-gray-800 bg-gray-800/40 p-3">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`relative text-xs font-medium text-gray-200 flex-1 ${d.asteroids?.length ? "cursor-help" : ""}`}
                    onMouseEnter={() => d.asteroids?.length && setHoveredItemId(d.sourceItemId)}
                    onMouseLeave={() => setHoveredItemId(null)}
                  >
                    {d.sourceItemName}
                    {d.asteroids?.length && <span className="ml-1 text-purple-400 text-xs">🪨</span>}
                    {hoveredItemId === d.sourceItemId && d.asteroids?.length && (
                      <AsteroidTooltip asteroids={d.asteroids} />
                    )}
                  </span>
                  <span className="text-xs text-gray-500">
                    Decompose <span className="text-purple-300 font-semibold">{d.unitsToDecompose}</span> units
                    ({d.runs} run{d.runs > 1 ? "s" : ""} of {d.inputQty})
                  </span>
                  <input
                    type="number"
                    min={0}
                    title="Stock"
                    className={`input w-24 text-right py-0.5 text-xs ${
                      (stock[d.sourceItemId] ?? d.actualStock) !== d.actualStock ? "border-cyan-600" : ""
                    }`}
                    value={stock[d.sourceItemId] ?? d.actualStock}
                    onChange={(e) => setStock((s) => ({ ...s, [d.sourceItemId]: Number(e.target.value) }))}
                  />
                  <span className="text-xs text-gray-600">in stock</span>
                </div>
                <div className="flex flex-wrap gap-1 text-xs text-gray-400">
                  <span className="text-gray-600">→</span>
                  {d.outputs.map((o) => (
                    <span key={o.itemId} className="bg-gray-700 rounded px-1.5 py-0.5 text-gray-300">
                      {o.itemName} <span className="text-yellow-400">×{o.quantityObtained}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.rawMaterials.length === 0 && result.intermediates.length === 0 && (
        <p className="text-gray-500 text-sm">Nothing to calculate.</p>
      )}

      {/* Single save button */}
      <div className="flex justify-end pt-1">
        <button
          onClick={saveAll}
          disabled={!hasChanges || saving}
          className={`btn-sm ${hasChanges ? "btn-primary" : "opacity-30"}`}
        >
          {saving ? "Saving…" : isRecalculating ? "Recalculating…" : "Update Stock & Recalculate"}
        </button>
      </div>
    </div>
  );
}
