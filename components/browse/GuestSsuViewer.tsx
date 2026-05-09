"use client";

import { useState, useEffect } from "react";
import type { CharacterSummary } from "@/lib/eve-assets";
import type { SsuSummary, SsuInventory } from "@/lib/sui";
import type { GuestCollection } from "@/hooks/useGuestCollections";

interface Props {
  character: CharacterSummary | null;
  collections: GuestCollection[];
  onAddItem: (collectionId: string, item: { typeId: number; name: string; quantity: number }) => void;
  onCreateCollection: (name: string) => string;
}

function AddToPackButton({
  name,
  collections,
  onAdd,
  onCreate,
}: {
  name: string;
  collections: GuestCollection[];
  onAdd: (collectionId: string) => void;
  onCreate: (name: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  function handleAdd(id: string) {
    onAdd(id);
    setOpen(false);
  }

  function handleCreate() {
    if (!newName.trim()) return;
    const id = onCreate(newName.trim());
    onAdd(id);
    setNewName("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={`Add ${name} to a pack`}
        className="text-xs px-2 py-0.5 rounded border border-gray-700 text-gray-400 hover:border-cyan-600 hover:text-cyan-400 transition-colors"
      >
        + Pack
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-2 w-48">
          {collections.length > 0 ? (
            <>
              <p className="text-xs text-gray-500 mb-1 px-1">Add to:</p>
              {collections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleAdd(c.id)}
                  className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-gray-800 text-gray-200 truncate"
                >
                  {c.name}
                </button>
              ))}
              <hr className="border-gray-700 my-1" />
            </>
          ) : null}
          <p className="text-xs text-gray-500 mb-1 px-1">Nuevo pack:</p>
          <div className="flex gap-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Nombre..."
              className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:border-cyan-600"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="text-xs px-2 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white disabled:opacity-40"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuestSsuViewer({ character, collections, onAddItem, onCreateCollection }: Props) {
  const [ssus, setSsus] = useState<SsuSummary[]>([]);
  const [ssusLoading, setSsusLoading] = useState(false);
  const [ssusError, setSsusError] = useState<string | null>(null);

  const [selectedSsu, setSelectedSsu] = useState<string | null>(null);
  const [inventory, setInventory] = useState<SsuInventory | null>(null);
  const [invLoading, setInvLoading] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);

  useEffect(() => {
    setSsus([]);
    setSelectedSsu(null);
    setInventory(null);
    if (!character) return;

    setSsusLoading(true);
    setSsusError(null);
    fetch(`/api/guest/ssus?characterId=${encodeURIComponent(character.id)}`)
      .then((r) => r.json())
      .then((d) => { if (d.ssus) setSsus(d.ssus); else setSsusError(d.error ?? "Error"); })
      .catch(() => setSsusError("No se pudieron cargar los SSUs"))
      .finally(() => setSsusLoading(false));
  }, [character]);

  useEffect(() => {
    setInventory(null);
    if (!selectedSsu) return;

    setInvLoading(true);
    setInvError(null);
    fetch(`/api/guest/ssu-inventory?address=${encodeURIComponent(selectedSsu)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setInvError(d.error);
        else setInventory(d);
      })
      .catch(() => setInvError("Error al cargar el inventario"))
      .finally(() => setInvLoading(false));
  }, [selectedSsu]);

  if (!character) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
        Select a character to view their SSUs
      </div>
    );
  }

  const capacityPct =
    inventory && inventory.maxCapacity > 0
      ? Math.round((inventory.usedCapacity / inventory.maxCapacity) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-gray-100">{character.name || "Unnamed character"}</h2>
        {character.corpId != null && (
          <p className="text-xs text-gray-500">Corp {character.corpId}</p>
        )}
      </div>

      {ssusLoading && <p className="text-sm text-gray-500">Loading SSUs…</p>}
      {ssusError && <p className="text-sm text-red-400">{ssusError}</p>}

      {!ssusLoading && !ssusError && ssus.length === 0 && (
        <p className="text-sm text-gray-500">This character has no SSUs.</p>
      )}

      {ssus.length > 0 && (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-2 text-left">SSU</th>
                <th className="px-4 py-2 text-center">Estado</th>
                <th className="px-4 py-2 text-right">Inventario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {ssus.map((ssu) => {
                const active = selectedSsu === ssu.address;
                const offline = ssu.status !== "ONLINE";
                return (
                  <tr key={ssu.address} className={`transition-colors ${active ? "bg-gray-800/60" : "hover:bg-gray-900/40"}`}>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-gray-100">
                        {ssu.name || ssu.address.slice(0, 10) + "…"}
                      </span>
                      <span className="ml-2 text-xs text-gray-600 font-mono hidden sm:inline">
                        {ssu.address.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${offline ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"}`}>
                        {ssu.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setSelectedSsu(active ? null : ssu.address)}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                          active
                            ? "border-cyan-600 text-cyan-300 bg-cyan-900/30"
                            : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                        }`}
                      >
                        {active ? "Cerrar" : "Ver"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedSsu && (
        <div className="space-y-3 border-t border-gray-800 pt-4">
          <h3 className="text-sm font-semibold text-gray-300">Inventario SSU</h3>
          {invLoading && <p className="text-sm text-gray-500">Loading inventory…</p>}
          {invError && (
            <div className="rounded bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
              {invError}
            </div>
          )}
          {inventory && (
            <div className="space-y-3">
              <div className="rounded-lg bg-gray-900 border border-gray-800 px-4 py-3 space-y-2">
                {inventory.name && <p className="text-base font-semibold text-gray-100">{inventory.name}</p>}
                {inventory.maxCapacity > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Capacidad</span>
                      <span>
                        {inventory.usedCapacity.toLocaleString()} / {inventory.maxCapacity.toLocaleString()} m³ ({capacityPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-800">
                      <div
                        className={`h-1.5 rounded-full transition-all ${capacityPct > 80 ? "bg-red-500" : capacityPct > 50 ? "bg-yellow-500" : "bg-cyan-500"}`}
                        style={{ width: `${Math.min(capacityPct, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500">{inventory.items.length} tipos de items</p>
              </div>

              {inventory.items.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Empty SSU</p>
              ) : (
                <div className="rounded-lg border border-gray-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-900 text-xs text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-2 text-left">Item</th>
                        <th className="px-4 py-2 text-left hidden sm:table-cell">Grupo</th>
                        <th className="px-4 py-2 text-right">Cantidad</th>
                        <th className="px-4 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {inventory.items.map((item) => (
                        <tr key={item.typeId} className="hover:bg-gray-900/50 transition-colors">
                          <td className="px-4 py-2">
                            <span className="text-gray-100 font-medium">{item.name}</span>
                            <span className="ml-2 text-xs text-gray-600">#{item.typeId}</span>
                          </td>
                          <td className="px-4 py-2 text-gray-400 text-xs hidden sm:table-cell">{item.groupName}</td>
                          <td className="px-4 py-2 text-right text-gray-100 font-medium">
                            {item.quantity.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <AddToPackButton
                              name={item.name}
                              collections={collections}
                              onAdd={(colId) => onAddItem(colId, { typeId: item.typeId, name: item.name, quantity: item.quantity })}
                              onCreate={(packName) => onCreateCollection(packName)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
