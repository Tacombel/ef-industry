import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const decompositions = await prisma.decomposition.findMany({
    include: {
      sourceItem: true,
      outputs: { include: { item: true } },
    },
    orderBy: { sourceItem: { name: "asc" } },
  });
  return NextResponse.json(decompositions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sourceItemId, inputQty = 1, outputs = [] } = body;

  if (!sourceItemId) {
    return NextResponse.json({ error: "sourceItemId is required" }, { status: 400 });
  }
  if (outputs.length === 0) {
    return NextResponse.json({ error: "At least one output is required" }, { status: 400 });
  }

  const decomposition = await prisma.decomposition.create({
    data: {
      sourceItemId,
      inputQty,
      outputs: {
        create: outputs.map((o: { itemId: string; quantity: number }) => ({
          itemId: o.itemId,
          quantity: o.quantity,
        })),
      },
    },
    include: {
      sourceItem: true,
      outputs: { include: { item: true } },
    },
  });

  return NextResponse.json(decomposition, { status: 201 });
}
