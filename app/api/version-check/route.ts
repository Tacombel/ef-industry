import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";

const REPO = "Tacombel/ef-industry";
const BRANCH = "main";

function getLocalCommit(): string | null {
  // Try git first (dev environment)
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    // Fall back to baked-in file (Docker production image)
    try {
      const sha = readFileSync(path.join(process.cwd(), ".commit-sha"), "utf8").trim();
      return sha && sha !== "unknown" ? sha : null;
    } catch {
      return null;
    }
  }
}

export async function GET() {
  const localCommit = getLocalCommit();
  if (!localCommit) {
    return NextResponse.json({ error: "Could not read local git commit" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/commits/${BRANCH}`,
      {
        headers: { Accept: "application/vnd.github+json" },
        next: { revalidate: 300 }, // cache 5 min
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "GitHub API error" }, { status: 502 });
    }

    const data = await res.json();
    const remoteCommit: string = data.sha;

    // In Docker we can't run git merge-base, so compare SHAs directly
    const upToDate = localCommit === remoteCommit || localCommit.startsWith(remoteCommit) || remoteCommit.startsWith(localCommit);

    return NextResponse.json({
      upToDate,
      localCommit: localCommit.slice(0, 7),
      remoteCommit: remoteCommit.slice(0, 7),
    });
  } catch {
    return NextResponse.json({ error: "Network error reaching GitHub" }, { status: 502 });
  }
}
