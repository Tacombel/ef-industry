"use client";

import { useEffect, useState, useMemo } from "react";

interface Refinery {
  id: string;
  name: string;
}

export default function RefineriesPage() {
  const [refineries, setRefineries] = useState<Refinery[]>([]);
  const [decompositions, setDecompositions] = useState<{ refinery: string }[]>([]);
  const decompositionsByRefinery = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of decompositions) counts[d.refinery] = (counts[d.refinery] ?? 0) + 1;
    return counts;
  }, [decompositions]);

  async function load() {
    const [rRes, dRes] = await Promise.all([fetch("/api/refineries"), fetch("/api/decompositions")]);
    setRefineries(await rRes.json());
    setDecompositions(await dRes.json());
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-100">Refineries</h1>
      </div>

      {refineries.length === 0 ? (
        <p className="text-gray-500 text-sm">No refineries available.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800 text-left">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4 text-right">Decompositions</th>
            </tr>
          </thead>
          <tbody>
            {refineries.map((r) => (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 pr-4 font-medium text-gray-200">{r.name}</td>
                <td className="py-2 pr-4 text-right text-gray-500 text-xs">{decompositionsByRefinery[r.name] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
