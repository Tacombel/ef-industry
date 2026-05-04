import { NextResponse } from "next/server";

/**
 * Returns a 403 response if data mutations are not explicitly enabled.
 * Use in API route mutations for static game data (items, blueprints, etc.)
 * to prevent accidental changes in production.
 *
 * Set ALLOW_DATA_MUTATIONS=1 to enable.
 */
export function requireDev(): NextResponse | null {
  if (process.env.ALLOW_DATA_MUTATIONS !== "1") {
    return NextResponse.json(
      { error: "Data mutations are disabled. Set ALLOW_DATA_MUTATIONS=1 to enable." },
      { status: 403 }
    );
  }
  return null;
}
