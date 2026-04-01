import { describe, it, expect } from "vitest";

/**
 * Validates that GCP credentials are set and can authenticate with BigQuery.
 */
describe("BigQuery Credentials", () => {
  it("should have GOOGLE_APPLICATION_CREDENTIALS_JSON set", () => {
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON).toBeTruthy();
  });

  it("should parse as valid JSON with required fields", () => {
    const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!);
    expect(creds).toHaveProperty("client_id");
    expect(creds).toHaveProperty("client_secret");
    expect(creds).toHaveProperty("refresh_token");
    expect(creds.type).toBe("authorized_user");
  });

  it("should authenticate with BigQuery successfully", async () => {
    const { BigQuery } = await import("@google-cloud/bigquery");
    const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!);
    
    const bq = new BigQuery({
      projectId: "moloco-ae-view",
      credentials: creds,
    });

    // Run a trivial query to validate auth
    const [rows] = await bq.query({
      query: "SELECT 1 as test_val",
      location: "US",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].test_val).toBe(1);
  }, 30000);
});
