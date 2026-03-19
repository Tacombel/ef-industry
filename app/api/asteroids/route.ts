import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const asteroids = await prisma.asteroidType.findMany({
    orderBy: { name: "asc" },
    include: {
      locations: { include: { location: true } },
      items: { include: { item: true } },
    },
  });
  return NextResponse.json(asteroids);
}

export async function POST(req: NextRequest) {
  const { name, locationIds = [], itemIds = [] } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const asteroid = await prisma.asteroidType.create({
    data: {
      name: name.trim(),
      locations: {
        create: (locationIds as string[]).map((locationId) => ({ locationId })),
      },
      items: {
        create: (itemIds as string[]).map((itemId) => ({ itemId })),
      },
    },
    include: {
      locations: { include: { location: true } },
      items: { include: { item: true } },
    },
  });
  return NextResponse.json(asteroid, { status: 201 });
}
