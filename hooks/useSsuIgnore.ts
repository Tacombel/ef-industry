"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "ssuIgnore";

export function useSsuIgnore() {
  const [ignoreSsu, setIgnoreSsuState] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setIgnoreSsuState(true);
  }, []);

  function setIgnoreSsu(value: boolean) {
    setIgnoreSsuState(value);
    if (value) {
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return { ignoreSsu, setIgnoreSsu };
}
