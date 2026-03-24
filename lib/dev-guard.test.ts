import { describe, it, expect, vi, afterEach } from "vitest";
import { requireDev } from "./dev-guard";

describe("requireDev", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(requireDev()).toBeNull();
  });

  it("returns a 403 response in production mode", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = requireDev();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body).toHaveProperty("error");
  });

  it("returns a 403 response outside development (test env)", () => {
    // vitest sets NODE_ENV=test by default — must also be blocked
    const res = requireDev();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });
});
