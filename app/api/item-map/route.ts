import { NextRequest, NextResponse } from "next/server";
import { fetchCalcItems } from "@/lib/calc-helpers";

/**
 * Returns the full item map (all items with blueprints/decompositions) for client-side calculations.
 * Supports caching via Last-Modified / If-Modified-Since headers.
 * Response is publicly cacheable for 5 minutes (game data changes infrequently).
 */
export async function GET(req: NextRequest) {
  return NextResponse.json(await fetchCalcItems(), {
    headers: {
      "cache-control": "public, max-age=300",
    },
  });
}
