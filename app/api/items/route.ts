import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const isRawMaterial = searchParams.get("isRawMaterial");
  const isFinalProduct = searchParams.get("isFinalProduct");
  const limit = Number(searchParams.get("limit") ?? "0") || 0;
  const offset = Number(searchParams.get("offset") ?? "0");

  const where = {
    name: search ? { contains: search } : undefined,
    isRawMaterial: isRawMaterial !== null ? isRawMaterial === "true" : undefined,
    isFinalProduct: isFinalProduct !== null ? isFinalProduct === "true" : undefined,
  };

  const items = await prisma.item.findMany({
    where,
    include: {
      blueprints: { select: { id: true, factory: true, outputQty: true, isDefault: true } },
      decompositions: { select: { id: true, refinery: true, primaryTypeId: true, isDefault: true, inputs: { select: { itemId: true, quantity: true } }, outputs: { select: { itemId: true, quantity: true } } } },
    },
    orderBy: { name: "asc" },
    ...(limit > 0 ? { take: Math.min(limit, 500), skip: offset } : {}),
  });

  return NextResponse.json(items);
}
