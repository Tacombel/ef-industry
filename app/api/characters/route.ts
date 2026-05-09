import { NextRequest, NextResponse } from "next/server";
import { getCachedCharacters } from "@/lib/eve-assets";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  try {
    const all = await getCachedCharacters();
    const ql = q.toLowerCase();
    const results = q
      ? all.filter((c) => c.name.toLowerCase().includes(ql) || c.id.toLowerCase().includes(ql))
      : [...all];
    results.sort((a, b) => (a.name || "￿").localeCompare(b.name || "￿"));
    return NextResponse.json({ characters: results, total: results.length });
  } catch {
    return NextResponse.json({ characters: [], total: 0, error: "Failed to fetch characters from blockchain" });
  }
}
