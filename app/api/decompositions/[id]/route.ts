import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const d = await prisma.decomposition.findUnique({
    where: { id: params.id },
    include: { sourceItem: true, outputs: { include: { item: true } } },
  });
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(d);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { inputQty, outputs } = body;

  const d = await prisma.$transaction(async (tx) => {
    if (outputs !== undefined) {
      await tx.decompositionOutput.deleteMany({ where: { decompositionId: params.id } });
    }
    return tx.decomposition.update({
      where: { id: params.id },
      data: {
        ...(inputQty !== undefined && { inputQty }),
        ...(outputs !== undefined && {
          outputs: {
            create: outputs.map((o: { itemId: string; quantity: number }) => ({
              itemId: o.itemId,
              quantity: o.quantity,
            })),
          },
        }),
      },
      include: { sourceItem: true, outputs: { include: { item: true } } },
    });
  });

  return NextResponse.json(d);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.decomposition.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
