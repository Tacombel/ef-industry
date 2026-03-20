import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.item.findMany({
    include: { stock: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    items.map((item) => ({
      id: item.id,
      name: item.name,
      isRawMaterial: item.isRawMaterial,
      isFound: item.isFound,
      isFinalProduct: item.isFinalProduct,
      quantity: item.stock?.quantity ?? 0,
    }))
  );
}
