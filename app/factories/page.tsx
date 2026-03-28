"use client";

import { useEffect, useState, useMemo } from "react";

interface Factory {
  id: string;
  name: string;
}

export default function FactoriesPage() {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [blueprints, setBlueprints] = useState<{ factory: string }[]>([]);
  const blueprintsByFactory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const bp of blueprints) counts[bp.factory] = (counts[bp.factory] ?? 0) + 1;
    return counts;
  }, [blueprints]);

  async function load() {
    const [fRes, bRes] = await Promise.all([fetch("/api/factories"), fetch("/api/blueprints")]);
    setFactories(await fRes.json());
    setBlueprints(await bRes.json());
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-100">Factories</h1>
      </div>

      {factories.length === 0 ? (
        <p className="text-gray-500 text-sm">No factories available.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800 text-left">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4 text-right">Blueprints</th>
            </tr>
          </thead>
          <tbody>
            {factories.map((f) => (
              <tr key={f.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 pr-4 font-medium text-gray-200">{f.name}</td>
                <td className="py-2 pr-4 text-right text-gray-500 text-xs">{blueprintsByFactory[f.name] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
