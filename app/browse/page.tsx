"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CharacterSummary } from "@/lib/eve-assets";
import CharacterList from "@/components/browse/CharacterList";
import GuestSsuViewer from "@/components/browse/GuestSsuViewer";
import GuestPacksPanel from "@/components/browse/GuestPacksPanel";
import { useGuestCollections } from "@/hooks/useGuestCollections";

export default function BrowsePage() {
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CharacterSummary | null>(null);
  const [packsOpen, setPacksOpen] = useState(false);

  const { collections, totalItems, createCollection, addItem } = useGuestCollections();

  useEffect(() => {
    fetch("/api/characters")
      .then((r) => r.json())
      .then((d) => {
        if (d.characters) setCharacters(d.characters);
        else setError(d.error ?? "Error al cargar personajes");
      })
      .catch(() => setError("No se pudo conectar con la blockchain"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
              ← Login
            </Link>
            <div>
              <h1 className="text-sm font-bold text-cyan-400">Browse sin login</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Explora personajes y SSUs de la blockchain</p>
            </div>
          </div>
          <button
            onClick={() => setPacksOpen(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-cyan-600 hover:text-cyan-400 transition-colors"
          >
            <span>Mis Packs</span>
            {totalItems > 0 && (
              <span className="bg-cyan-700 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                {collections.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Cargando personajes desde la blockchain…</p>
            <p className="text-gray-600 text-xs">Puede tardar unos segundos la primera vez</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); fetch("/api/characters").then((r) => r.json()).then((d) => { if (d.characters) setCharacters(d.characters); else setError(d.error ?? "Error"); }).catch(() => setError("Error de red")).finally(() => setLoading(false)); }}
              className="text-xs text-gray-400 hover:text-gray-200 underline"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 h-[calc(100vh-120px)]">
            {/* Character list */}
            <div className="flex flex-col">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Personajes
              </h2>
              <div className="flex-1 min-h-0">
                <CharacterList
                  characters={characters}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelected}
                />
              </div>
            </div>

            {/* SSU viewer */}
            <div className="overflow-y-auto">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {selected ? `SSUs de ${selected.name || "personaje"}` : "SSUs"}
              </h2>
              <GuestSsuViewer
                character={selected}
                collections={collections}
                onAddItem={addItem}
                onCreateCollection={createCollection}
              />
            </div>
          </div>
        )}
      </div>

      <GuestPacksPanel open={packsOpen} onClose={() => setPacksOpen(false)} />
    </div>
  );
}
