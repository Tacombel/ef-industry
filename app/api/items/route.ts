import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeName } from "@/lib/normalize";
import { requireAdmin } from "@/lib/auth";
import { requireDev } from "@/lib/dev-guard";

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

export async function POST(req: NextRequest) {
  const devError = requireDev();
  if (devError) return devError;
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await req.json();
  const { name, isRawMaterial = false, isFound = false, isFinalProduct = false, volume = 0 } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const item = await prisma.item.create({
    data: { name: normalizeName(name), isRawMaterial, isFound, isFinalProduct, volume },
    include: {
      blueprints: { select: { id: true, factory: true, outputQty: true, isDefault: true } },
      decompositions: { select: { id: true, refinery: true, primaryTypeId: true, isDefault: true, inputs: { select: { itemId: true, quantity: true } }, outputs: { select: { itemId: true, quantity: true } } } },
    },
  });

  return NextResponse.json(item, { status: 201 });
}
