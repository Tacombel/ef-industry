import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getAllCharacters } from "@/lib/eve-assets";

const getCachedCharacters = unstable_cache(getAllCharacters, ["all-characters"], {
  revalidate: 300,
});

export async function GET() {
  try {
    const characters = await getCachedCharacters();
    return NextResponse.json({ characters });
  } catch {
    return NextResponse.json({ characters: [], error: "Failed to fetch characters from blockchain" });
  }
}
