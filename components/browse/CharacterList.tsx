"use client";

import { useMemo, useState } from "react";
import type { CharacterSummary } from "@/lib/eve-assets";

interface Props {
  characters: CharacterSummary[];
  selectedId: string | null;
  onSelect: (character: CharacterSummary) => void;
}

export default function CharacterList({ characters, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [corpFilter, setCorpFilter] = useState<number | "">("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const corps = useMemo(() => {
    const ids = new Set<number>();
    for (const c of characters) {
      if (c.corpId != null) ids.add(c.corpId);
    }
    return [...ids].sort((a, b) => a - b);
  }, [characters]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return characters.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (corpFilter !== "" && c.corpId !== corpFilter) return false;
      return true;
    });
  }, [characters, search, corpFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(0);
  }

  function handleCorp(v: string) {
    setCorpFilter(v === "" ? "" : Number(v));
    setPage(0);
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="space-y-2">
        <input
          type="search"
          placeholder="Buscar personaje..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-600"
        />
        {corps.length > 0 && (
          <select
            value={String(corpFilter)}
            onChange={(e) => handleCorp(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-cyan-600"
          >
            <option value="">Todas las corps</option>
            {corps.map((id) => (
              <option key={id} value={id}>Corp {id}</option>
            ))}
          </select>
        )}
        <p className="text-xs text-gray-500">
          {filtered.length} personaje{filtered.length !== 1 ? "s" : ""}
          {search || corpFilter !== "" ? ` de ${characters.length}` : " en total"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 rounded-lg border border-gray-800 divide-y divide-gray-800">
        {visible.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Sin resultados</p>
        ) : (
          visible.map((c) => {
            const active = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className={`w-full text-left px-3 py-2.5 transition-colors ${
                  active
                    ? "bg-cyan-900/30 border-l-2 border-cyan-500"
                    : "hover:bg-gray-800/60 border-l-2 border-transparent"
                }`}
              >
                <span className={`text-sm font-medium ${active ? "text-cyan-300" : "text-gray-200"}`}>
                  {c.name || <span className="text-gray-500 italic">Sin nombre</span>}
                </span>
                {c.corpId != null && (
                  <span className="ml-2 text-xs text-gray-500">Corp {c.corpId}</span>
                )}
              </button>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-2 py-1 rounded hover:text-gray-300 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span>{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-2 py-1 rounded hover:text-gray-300 disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
