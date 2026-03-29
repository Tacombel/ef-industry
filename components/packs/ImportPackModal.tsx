"use client";

import { useState, useMemo } from "react";

interface Item { id: string; name: string }

interface ParsedRow {
  name: string;
  quantity: number;
  itemId: string;
  found: boolean;
}

interface Parsed {
  packName: string;
  rows: ParsedRow[];
}

function parseFit(text: string, items: Item[]): Parsed | null {
  const lines = text.trim().split("\n");
  if (!lines.length) return null;

  const header = lines[0].match(/^\[(.+?),\s*(.+)\]$/);
  if (!header) return null;

  const shipName = header[1].trim();
  const packName = header[2].trim();

  const itemMap = new Map<string, Item>();
  for (const item of items) {
    itemMap.set(item.name.toLowerCase(), item);
  }

  // Aggregate item counts (ship first, then modules/ammo)
  const counts = new Map<string, number>();
  counts.set(shipName, 1);

  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(.+?)\s+x(\d+)$/i) ?? trimmed.match(/^(.+?)$/);
    if (!match) continue;

    const name = match[1].trim();
    const qty = trimmed.match(/^.+?\s+x(\d+)$/i)?.[1] ? parseInt(trimmed.match(/^.+?\s+x(\d+)$/i)![1]) : 1;

    counts.set(name, (counts.get(name) ?? 0) + qty);
  }

  const rows: ParsedRow[] = [];
  for (const [name, quantity] of counts) {
    const item = itemMap.get(name.toLowerCase());
    rows.push({ name, quantity, itemId: item?.id ?? "", found: !!item });
  }

  return { packName, rows };
}

interface Props {
  items: Item[];
  onClose: () => void;
  onImported: () => void;
}

export default function ImportPackModal({ items, onClose, onImported }: Props) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const parsed = useMemo(() => (text.trim() ? parseFit(text, items) : null), [text, items]);

  const validRows = parsed?.rows.filter((r) => r.found) ?? [];
  const unknownRows = parsed?.rows.filter((r) => !r.found) ?? [];

  async function handleImport() {
    if (!parsed || validRows.length === 0) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: parsed.packName,
        items: validRows.map((r) => ({ itemId: r.itemId, quantity: r.quantity })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create pack");
      return;
    }
    onImported();
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Import pack from fit</h2>

        <textarea
          className="input w-full font-mono text-xs h-48 resize-none mb-4"
          placeholder={"[Reiver, Reiver #1B-44P2]\nBulwark Shield Generator II\nAfterburner II\n\nSojourn\n\nAC Gyrojet Ammo 1 (S)  x1000"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />

        {parsed && (
          <div className="mb-4 space-y-2">
            <p className="text-sm text-gray-300">
              Pack: <span className="font-medium text-gray-100">{parsed.packName}</span>
            </p>

            {validRows.length > 0 && (
              <div className="rounded border border-gray-700 divide-y divide-gray-700/50 max-h-40 overflow-y-auto">
                {validRows.map((r) => (
                  <div key={r.name} className="flex justify-between px-3 py-1 text-xs text-gray-300">
                    <span>{r.name}</span>
                    <span className="text-gray-500">×{r.quantity}</span>
                  </div>
                ))}
              </div>
            )}

            {unknownRows.length > 0 && (
              <div className="rounded border border-yellow-800/50 bg-yellow-900/10 p-2">
                <p className="text-xs text-yellow-500 mb-1">Not found in database (will be skipped):</p>
                {unknownRows.map((r) => (
                  <p key={r.name} className="text-xs text-yellow-600">{r.name} ×{r.quantity}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {!parsed && text.trim() && (
          <p className="text-xs text-red-400 mb-4">Could not parse fit. Make sure the first line is <code>[Ship, Pack name]</code></p>
        )}

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-sm btn-secondary">Cancel</button>
          <button
            onClick={handleImport}
            disabled={!parsed || validRows.length === 0 || saving}
            className="btn-sm btn-primary disabled:opacity-50"
          >
            {saving ? "Importing…" : `Import${validRows.length ? ` (${validRows.length} items)` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
