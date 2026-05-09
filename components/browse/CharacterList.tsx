"use client";

import { useState } from "react";
import type { CharacterSummary } from "@/lib/eve-assets";

interface Props {
  characters: CharacterSummary[];
  total: number;
  query: string;
  onQueryChange: (q: string) => void;
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (character: CharacterSummary) => void;
}

const PAGE_SIZE = 50;

export default function CharacterList({ characters, query, onQueryChange, loading, error, selectedId, onSelect }: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(characters.length / PAGE_SIZE);
  const visible = characters.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleQuery(v: string) {
    onQueryChange(v);
    setPage(0);
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="space-y-2">
        <input
          type="search"
          placeholder="Search character..."
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-600"
        />
        <p className="text-xs text-gray-500">
          {loading
            ? (query.trim() ? "Searching…" : "Loading…")
            : error ? ""
            : characters.length > 0
              ? (query.trim()
                  ? `${characters.length} result${characters.length !== 1 ? "s" : ""}`
                  : `${characters.length} character${characters.length !== 1 ? "s" : ""}`)
              : ""}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 rounded-lg border border-gray-800 divide-y divide-gray-800">
        {error ? (
          <p className="text-sm text-red-400 text-center py-8">{error}</p>
        ) : loading ? (
          <p className="text-sm text-gray-500 text-center py-8">{query.trim() ? "Searching…" : "Loading…"}</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No results</p>
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
                  {c.name || <span className="text-gray-500 italic">Unnamed</span>}
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
            ← Previous
          </button>
          <span>{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-2 py-1 rounded hover:text-gray-300 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
