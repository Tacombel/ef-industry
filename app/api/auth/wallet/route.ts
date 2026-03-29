import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function POST(req: NextRequest) {
  const { walletAddress, characterName, signature, nonce } = await req.json();

  if (!walletAddress || !signature || !nonce) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 1. Verify the nonce hasn't expired (it's a JWT we issued)
  let nonceValue: string;
  try {
    const { payload } = await jwtVerify(nonce, getSecret());
    if (typeof payload.nonce !== "string") throw new Error("Invalid nonce payload");
    nonceValue = payload.nonce;
  } catch {
    return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 401 });
  }

  // 2. Verify the wallet signature over the nonce
  try {
    const message = new TextEncoder().encode(nonceValue);
    const recoveredAddress = await verifyPersonalMessageSignature(message, signature);
    if (recoveredAddress !== walletAddress) {
      return NextResponse.json({ error: "Signature mismatch" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 3. Find or create the user by wallet address
  let user = await prisma.user.findUnique({ where: { walletAddress } });

  const displayName = characterName?.trim() || walletAddress.slice(0, 16);

  if (!user) {
    // New wallet user — pick a username that doesn't collide
    let username = displayName;
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      username = `${displayName}_${walletAddress.slice(-6)}`;
    }
    user = await prisma.user.create({
      data: { username, walletAddress, role: "USER" },
    });
  } else if (characterName?.trim() && user.username !== characterName.trim()) {
    // Update character name if it changed (and the new name isn't taken by another user)
    const newName = characterName.trim();
    const taken = await prisma.user.findFirst({
      where: { username: newName, NOT: { id: user.id } },
    });
    if (!taken) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { username: newName },
      });
    }
  }

  await createSession({ userId: user.id, username: user.username, role: user.role });
  return NextResponse.json({ username: user.username });
}
