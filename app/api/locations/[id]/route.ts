import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const location = await prisma.location.update({
    where: { id: params.id },
    data: { name: name.trim() },
  });
  return NextResponse.json(location);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.location.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
