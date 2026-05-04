import { describe, it, expect, vi, afterEach } from "vitest";
import { requireDev } from "./dev-guard";

describe("requireDev", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when ALLOW_DATA_MUTATIONS=1", () => {
    vi.stubEnv("ALLOW_DATA_MUTATIONS", "1");
    expect(requireDev()).toBeNull();
  });

  it("returns a 403 response when ALLOW_DATA_MUTATIONS is not set", async () => {
    vi.stubEnv("ALLOW_DATA_MUTATIONS", "");
    const res = requireDev();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body).toHaveProperty("error");
  });

  it("returns a 403 response when ALLOW_DATA_MUTATIONS is 0", () => {
    vi.stubEnv("ALLOW_DATA_MUTATIONS", "0");
    const res = requireDev();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });
});
