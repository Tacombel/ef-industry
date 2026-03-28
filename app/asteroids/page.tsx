"use client";

import { useEffect, useState } from "react";

interface Location {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  isRawMaterial: boolean;
  isFound?: boolean;
}

interface AsteroidType {
  id: string;
  name: string;
  locations: { location: Location }[];
  items: { item: Item }[];
}

export default function AsteroidsPage() {
  const [asteroids, setAsteroids] = useState<AsteroidType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  async function loadAll() {
    const [a, l] = await Promise.all([
      fetch("/api/asteroids").then((r) => r.json()),
      fetch("/api/locations").then((r) => r.json()),
    ]);
    setAsteroids(a);
    setLocations(l);
  }

  useEffect(() => { loadAll(); }, []);

  return (
    <div className="p-6 space-y-10 max-w-4xl">
      <h1 className="text-xl font-bold text-gray-100">Asteroids &amp; Locations</h1>

      {/* ── Asteroid Types ─────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-cyan-300">Asteroid Types</h2>
        </div>

        {asteroids.length === 0 ? (
          <p className="text-gray-500 text-sm">No asteroid types available.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800 text-left">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Locations</th>
                <th className="pb-2 pr-4 w-96">Ore Items</th>
              </tr>
            </thead>
            <tbody>
              {asteroids.map((a) => (
                <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 pr-4 font-medium text-gray-200">{a.name}</td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {a.locations.length === 0
                        ? <span className="text-gray-600 text-xs">—</span>
                        : a.locations.map((l) => (
                          <span key={l.location.id} className="badge badge-blue">{l.location.name}</span>
                        ))}
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {a.items.length === 0
                        ? <span className="text-gray-600 text-xs">—</span>
                        : a.items.map((i) => (
                          <span key={i.item.id} className="badge badge-yellow">{i.item.name}</span>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Locations ──────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-cyan-300">Locations</h2>
        </div>

        {locations.length === 0 ? (
          <p className="text-gray-500 text-sm">No locations available.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800 text-left">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Used in</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => {
                const usedIn = asteroids.filter((a) =>
                  a.locations.some((al) => al.location.id === l.id)
                );
                return (
                  <tr key={l.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 pr-4 font-medium text-gray-200">{l.name}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {usedIn.length === 0
                          ? <span className="text-gray-600 text-xs">—</span>
                          : usedIn.map((a) => (
                            <span key={a.id} className="badge badge-blue">{a.name}</span>
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
