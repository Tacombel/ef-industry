"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CharacterSummary } from "@/lib/eve-assets";
import CharacterList from "@/components/browse/CharacterList";
import GuestSsuViewer from "@/components/browse/GuestSsuViewer";
import { useGuestCollections } from "@/hooks/useGuestCollections";

export default function BrowsePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CharacterSummary | null>(null);

  const { collections, createCollection, addItem } = useGuestCollections();

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    const url = query.trim()
      ? `/api/characters?q=${encodeURIComponent(query.trim())}`
      : `/api/characters`;
    const delay = query.trim() ? 300 : 0;

    const timer = setTimeout(() => {
      fetch(url, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          setCharacters(d.characters ?? []);
          setTotal(d.total ?? 0);
          if (d.error) setError(d.error);
          setLoading(false);
        })
        .catch((e) => {
          if (cancelled) return;
          if (e.name !== "AbortError") setError("Could not connect to the blockchain");
          setLoading(false);
        });
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function handleThisIsMe(character: CharacterSummary) {
    localStorage.setItem("ef-guest-character", JSON.stringify({ id: character.id, name: character.name }));
    router.push("/dashboard");
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Dashboard
          </Link>
          <div>
            <h1 className="text-sm font-bold text-cyan-400">Anonymous Browse</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Browse blockchain characters and SSUs — no account needed</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
            {/* Character list */}
            <div className="flex flex-col min-h-0">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 shrink-0">
                Characters
              </h2>
              <div className="flex-1 min-h-0">
                <CharacterList
                  characters={characters}
                  total={total}
                  query={query}
                  onQueryChange={setQuery}
                  loading={loading}
                  error={error}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelected}
                />
              </div>
            </div>

            {/* SSU viewer */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h2 className="text-xs font-semibold text-gray-500 tracking-wider">
                  {selected ? `SSUs — ${selected.name || "Unnamed"}` : "SSUs"}
                </h2>
                {selected && (
                  <button
                    onClick={() => handleThisIsMe(selected)}
                    className="text-xs px-3 py-1.5 rounded border border-cyan-700 text-cyan-400 hover:bg-cyan-900/30 transition-colors"
                  >
                    This is me →
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                <GuestSsuViewer
                  character={selected}
                  collections={collections}
                  onAddItem={addItem}
                  onCreateCollection={createCollection}
                />
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
