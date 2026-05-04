import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // Check if registration is open (only applies to user/password accounts)
  const settings = await prisma.settings.findUnique({ where: { id: "global" } });
  if (settings && !settings.registrationOpen) {
    return NextResponse.json({ error: "Registration is currently closed" }, { status: 403 });
  }

  const { username, password } = await req.json();

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }
  if (username.trim().length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const trimmed = username.trim();

  const existing = await prisma.user.findFirst({
    where: { username: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const role = "USER";

  const user = await prisma.user.create({
    data: { username: trimmed, password: hashed, role },
  });

  await createSession({ userId: user.id, username: user.username, role: user.role });
  return NextResponse.json({ username: user.username }, { status: 201 });
}
