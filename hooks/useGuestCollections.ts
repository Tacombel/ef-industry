"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "ef-guest-collections";

export interface GuestCollectionItem {
  typeId: number;
  name: string;
  quantity: number;
}

export interface GuestCollection {
  id: string;
  name: string;
  description?: string;
  items: GuestCollectionItem[];
  createdAt: string;
}

function load(): GuestCollection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(collections: GuestCollection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
}

export function useGuestCollections() {
  const [collections, setCollections] = useState<GuestCollection[]>([]);

  useEffect(() => {
    setCollections(load());
  }, []);

  const persist = useCallback((next: GuestCollection[]) => {
    save(next);
    setCollections(next);
  }, []);

  const createCollection = useCallback(
    (name: string, description?: string): string => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newCollection: GuestCollection = {
        id,
        name: name.trim(),
        description,
        items: [],
        createdAt: new Date().toISOString(),
      };
      persist([...load(), newCollection]);
      return id;
    },
    [persist]
  );

  const deleteCollection = useCallback(
    (id: string) => {
      persist(load().filter((c) => c.id !== id));
    },
    [persist]
  );

  const addItem = useCallback(
    (collectionId: string, item: GuestCollectionItem) => {
      const current = load();
      const next = current.map((c) => {
        if (c.id !== collectionId) return c;
        const existing = c.items.find((i) => i.typeId === item.typeId);
        if (existing) {
          return {
            ...c,
            items: c.items.map((i) =>
              i.typeId === item.typeId ? { ...i, quantity: i.quantity + item.quantity } : i
            ),
          };
        }
        return { ...c, items: [...c.items, item] };
      });
      persist(next);
    },
    [persist]
  );

  const removeItem = useCallback(
    (collectionId: string, typeId: number) => {
      const current = load();
      persist(
        current.map((c) =>
          c.id === collectionId ? { ...c, items: c.items.filter((i) => i.typeId !== typeId) } : c
        )
      );
    },
    [persist]
  );

  const updateItemQty = useCallback(
    (collectionId: string, typeId: number, quantity: number) => {
      const current = load();
      persist(
        current.map((c) =>
          c.id === collectionId
            ? { ...c, items: c.items.map((i) => (i.typeId === typeId ? { ...i, quantity } : i)) }
            : c
        )
      );
    },
    [persist]
  );

  const exportJSON = useCallback(() => {
    const data = JSON.stringify(load(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ef-packs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const totalItems = collections.reduce((s, c) => s + c.items.length, 0);

  return {
    collections,
    totalItems,
    createCollection,
    deleteCollection,
    addItem,
    removeItem,
    updateItemQty,
    exportJSON,
  };
}
