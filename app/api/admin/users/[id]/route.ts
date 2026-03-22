import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const session = await getSession();
  const { role } = await req.json();

  if (!["USER", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // An admin cannot demote themselves
  if (params.id === session!.userId && role === "USER") {
    return NextResponse.json({ error: "You cannot demote yourself" }, { status: 403 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { role },
    select: { id: true, username: true, role: true, createdAt: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const session = await getSession();

  // An admin cannot delete themselves
  if (params.id === session!.userId) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
