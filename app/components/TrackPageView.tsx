"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function TrackPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/" || pathname.startsWith("/admin")) return;

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
