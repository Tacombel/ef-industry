import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { itemId: string } }) {
  const { quantity } = await req.json();

  if (typeof quantity !== "number" || quantity < 0) {
    return NextResponse.json({ error: "quantity must be a non-negative number" }, { status: 400 });
  }

  const stock = await prisma.stock.upsert({
    where: { itemId: params.itemId },
    update: { quantity },
    create: { itemId: params.itemId, quantity },
  });

  return NextResponse.json(stock);
}
