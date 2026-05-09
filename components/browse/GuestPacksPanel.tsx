"use client";

import { useState } from "react";
import { useGuestCollections } from "@/hooks/useGuestCollections";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GuestPacksPanel({ open, onClose }: Props) {
  const { collections, createCollection, deleteCollection, removeItem, updateItemQty, exportJSON } =
    useGuestCollections();
  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!open) return null;

  function handleCreate() {
    if (!newName.trim()) return;
    createCollection(newName.trim());
    setNewName("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col mt-14"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-bold text-gray-100">Mis Packs</h2>
          <div className="flex items-center gap-2">
            {collections.length > 0 && (
              <button
                onClick={exportJSON}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                title="Exportar packs como JSON"
              >
                Exportar
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {collections.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No packs yet.<br />Add items from a SSU's inventory.
            </p>
          )}

          {collections.map((col) => {
            const expanded = expandedId === col.id;
            return (
              <div key={col.id} className="rounded-lg border border-gray-800 overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : col.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="text-left">
                    <span className="text-sm font-medium text-gray-100">{col.name}</span>
                    <span className="ml-2 text-xs text-gray-500">{col.items.length} items</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteCollection(col.id); }}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors px-1"
                      title="Delete pack"
                    >
                      ✕
                    </button>
                    <span className="text-gray-500 text-xs">{expanded ? "▲" : "▼"}</span>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-gray-800 divide-y divide-gray-800">
                    {col.items.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-3">Empty pack</p>
                    ) : (
                      col.items.map((item) => (
                        <div key={item.typeId} className="flex items-center gap-2 px-3 py-2">
                          <span className="flex-1 text-xs text-gray-200 truncate">{item.name}</span>
                          <input
                            type="number"
                            value={item.quantity}
                            min={1}
                            onChange={(e) => updateItemQty(col.id, item.typeId, Math.max(1, Number(e.target.value)))}
                            className="w-16 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-100 text-right focus:outline-none focus:border-cyan-600"
                          />
                          <button
                            onClick={() => removeItem(col.id, item.typeId)}
                            className="text-gray-600 hover:text-red-400 transition-colors text-xs"
                            title="Quitar item"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-800 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Nuevo pack..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-600"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-3 py-1.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-medium disabled:opacity-40 transition-colors"
            >
              Crear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
