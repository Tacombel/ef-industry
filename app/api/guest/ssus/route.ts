import { NextRequest, NextResponse } from "next/server";
import { getSsusByCharacterId } from "@/lib/sui";

const SUI_ADDRESS_RE = /^0x[0-9a-f]{64}$/i;

export async function GET(req: NextRequest) {
  const characterId = req.nextUrl.searchParams.get("characterId")?.trim() ?? "";
  if (!SUI_ADDRESS_RE.test(characterId)) {
    return NextResponse.json({ error: "Invalid characterId" }, { status: 400 });
  }

  try {
    const ssus = await getSsusByCharacterId(characterId);
    return NextResponse.json({ ssus });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
