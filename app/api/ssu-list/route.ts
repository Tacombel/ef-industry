import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserSsus } from "@/lib/sui";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { walletAddress: true },
  });

  if (!user?.walletAddress) {
    return NextResponse.json({ error: "No wallet address linked to this account" }, { status: 400 });
  }

  try {
    const ssus = await getUserSsus(user.walletAddress);

    // Resolve type names from DB for SSUs without a custom name
    const typeIds = ssus.map((s) => s.typeId).filter(Boolean);
    const items = typeIds.length > 0
      ? await prisma.item.findMany({
          where: { typeId: { in: typeIds } },
          select: { typeId: true, name: true },
        })
      : [];
    const typeNames = new Map(items.map((i) => [i.typeId!, i.name]));

    const resolved = ssus.map((s) => ({
      ...s,
      displayName: s.name || typeNames.get(s.typeId) || s.address.slice(0, 10) + "…",
    }));

    return NextResponse.json({ ssus: resolved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
