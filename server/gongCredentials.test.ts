import { describe, it, expect } from "vitest";
import * as fs from "fs";

/**
 * Validates that Gong API credentials are accessible (env or bashrc fallback)
 * and can authenticate with the Gong v2 API.
 */

function getGongCreds(): { apiKey: string; apiSecret: string } {
  let apiKey = process.env.GONG_API_KEY || "";
  let apiSecret = process.env.GONG_API_SECRET_KEY || "";

  // Check if secret looks valid (real JWT is ~150 chars)
  const secretLooksValid = apiSecret.length > 50 && apiSecret.startsWith("eyJ");

  if (!apiKey || !apiSecret || !secretLooksValid) {
    // Fallback: read from ~/.bashrc (sandbox)
    try {
      const bashrc = fs.readFileSync("/home/ubuntu/.bashrc", "utf-8");
      const keyMatch = bashrc.match(/export\s+GONG_API_KEY=["']?([^"'\n]+)["']?/);
      const secretMatch = bashrc.match(/export\s+GONG_API_SECRET_KEY=["']?([^"'\n]+)["']?/);
      if (keyMatch) apiKey = keyMatch[1];
      if (secretMatch) apiSecret = secretMatch[1];
    } catch {
      // Not in sandbox
    }
  }

  return { apiKey, apiSecret };
}

describe("Gong API Credentials", () => {
  it("should have GONG_API_KEY available", () => {
    const { apiKey } = getGongCreds();
    expect(apiKey).toBeTruthy();
    expect(apiKey.length).toBeGreaterThan(10);
  });

  it("should have GONG_API_SECRET_KEY available", () => {
    const { apiSecret } = getGongCreds();
    expect(apiSecret).toBeTruthy();
    expect(apiSecret.length).toBeGreaterThan(50);
    expect(apiSecret).toMatch(/^eyJ/); // JWT format
  });

  it("should authenticate with Gong API successfully", async () => {
    const { apiKey, apiSecret } = getGongCreds();
    const token = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const resp = await fetch("https://api.gong.io/v2/calls?fromDateTime=2026-03-01T00:00:00Z&toDateTime=2026-04-01T00:00:00Z", {
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/json",
      },
    });

    // 200 = success, auth works
    expect(resp.status).toBe(200);
  }, 15000);
});
