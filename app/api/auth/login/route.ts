import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<{ id: string; username: string; password: string; role: string }[]>`
    SELECT id, username, password, role FROM "User" WHERE LOWER(username) = LOWER(${username.trim()}) LIMIT 1
  `;
  const user = rows[0] ?? null;
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession({ userId: user.id, username: user.username, role: user.role });
  return NextResponse.json({ username: user.username });
}
