/**
 * Speedboat MCP — Direct HTTP Client with OAuth 2.0 PKCE
 *
 * This module handles:
 * 1. OAuth 2.0 dynamic client registration + PKCE auth flow
 * 2. Token management (access + refresh)
 * 3. MCP JSON-RPC calls to Speedboat tools
 *
 * The auth flow requires a one-time browser login by the user.
 * After that, tokens are cached and auto-refreshed.
 */

import crypto from "crypto";

const SPEEDBOAT_BASE = "https://speedboat-mcp-891923006843.us-central1.run.app";
const MCP_ENDPOINT = `${SPEEDBOAT_BASE}/mcp`;

// ── OAuth State ──────────────────────────────────────────────────────────────

interface OAuthClient {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
}

interface PkceChallenge {
  verifier: string;
  challenge: string;
  state: string;
}

let oauthClient: OAuthClient | null = null;
let tokenSet: TokenSet | null = null;
let pkceChallenge: PkceChallenge | null = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function generatePkce(): PkceChallenge {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  const state = base64url(crypto.randomBytes(16));
  return { verifier, challenge, state };
}

// ── OAuth Registration ───────────────────────────────────────────────────────

async function registerClient(redirectUri: string): Promise<OAuthClient> {
  const res = await fetch(`${SPEEDBOAT_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "ctv-engine-live",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "client_secret_post",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth registration failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    clientId: data.client_id,
    clientSecret: data.client_secret,
    redirectUri,
  };
}

// ── Auth URL Generation ──────────────────────────────────────────────────────

export async function getSpeedboatAuthUrl(origin: string): Promise<string> {
  const redirectUri = `${origin}/api/speedboat/callback`;

  // Register a new client for this origin
  oauthClient = await registerClient(redirectUri);
  pkceChallenge = generatePkce();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: oauthClient.clientId,
    redirect_uri: oauthClient.redirectUri,
    scope: "openid https://www.googleapis.com/auth/userinfo.email",
    code_challenge: pkceChallenge.challenge,
    code_challenge_method: "S256",
    state: pkceChallenge.state,
  });

  return `${SPEEDBOAT_BASE}/authorize?${params.toString()}`;
}

// ── Token Exchange ───────────────────────────────────────────────────────────

export async function exchangeCodeForToken(code: string, state: string): Promise<boolean> {
  if (!oauthClient || !pkceChallenge) {
    throw new Error("OAuth flow not initialized — call getSpeedboatAuthUrl first");
  }

  if (state !== pkceChallenge.state) {
    throw new Error("State mismatch — possible CSRF attack");
  }

  const res = await fetch(`${SPEEDBOAT_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: oauthClient.redirectUri,
      client_id: oauthClient.clientId,
      client_secret: oauthClient.clientSecret,
      code_verifier: pkceChallenge.verifier,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[Speedboat] Token exchange failed:", res.status, text);
    return false;
  }

  const data = await res.json();
  tokenSet = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  console.log("[Speedboat] Auth successful — token acquired");
  return true;
}

// ── Token Refresh ────────────────────────────────────────────────────────────

async function refreshAccessToken(): Promise<boolean> {
  if (!oauthClient || !tokenSet?.refreshToken) return false;

  try {
    const res = await fetch(`${SPEEDBOAT_BASE}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokenSet.refreshToken,
        client_id: oauthClient.clientId,
        client_secret: oauthClient.clientSecret,
      }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    tokenSet = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokenSet.refreshToken,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };

    console.log("[Speedboat] Token refreshed");
    return true;
  } catch {
    return false;
  }
}

async function getValidToken(): Promise<string | null> {
  if (!tokenSet) return null;

  // Refresh if within 5 minutes of expiry
  if (tokenSet.expiresAt - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) return null;
  }

  return tokenSet.accessToken;
}

// ── MCP JSON-RPC Calls ──────────────────────────────────────────────────────

let mcpSessionId: string | null = null;

async function mcpCall(method: string, params: Record<string, unknown> = {}): Promise<any> {
  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated with Speedboat");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  if (mcpSessionId) {
    headers["Mcp-Session-Id"] = mcpSessionId;
  }

  const body = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  };

  const res = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  // Capture session ID from response
  const sessionHeader = res.headers.get("mcp-session-id");
  if (sessionHeader) mcpSessionId = sessionHeader;

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MCP call failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`MCP error: ${JSON.stringify(data.error)}`);
  }

  return data.result;
}

// ── Initialize MCP Session ──────────────────────────────────────────────────

async function ensureSession(): Promise<void> {
  if (mcpSessionId) return;

  await mcpCall("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "ctv-engine", version: "1.0" },
  });
}

// ── Public Tool Wrappers ────────────────────────────────────────────────────

export async function resolveEntity(name: string): Promise<any> {
  await ensureSession();
  return mcpCall("tools/call", {
    name: "resolve_moloco_entity",
    arguments: { name },
  });
}

export async function getGtmPerformance(
  entityId: string,
  startDate: string,
  endDate: string,
  metrics?: string[]
): Promise<any> {
  await ensureSession();
  return mcpCall("tools/call", {
    name: "data_retrieval_for_gtm",
    arguments: {
      entity_id: entityId,
      start_date: startDate,
      end_date: endDate,
      ...(metrics ? { metrics } : {}),
    },
  });
}

export async function getCampaignDetails(
  entityId: string,
  startDate?: string,
  endDate?: string,
  status?: string
): Promise<any> {
  await ensureSession();
  return mcpCall("tools/call", {
    name: "get_campaign_details",
    arguments: {
      entity_id: entityId,
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
      ...(status ? { status } : {}),
    },
  });
}

export async function getPerformanceTrends(
  entityId: string,
  startDate: string,
  endDate: string,
  granularity: string = "daily",
  metrics?: string[]
): Promise<any> {
  await ensureSession();
  return mcpCall("tools/call", {
    name: "get_performance_trends",
    arguments: {
      entity_id: entityId,
      start_date: startDate,
      end_date: endDate,
      granularity,
      ...(metrics ? { metrics } : {}),
    },
  });
}

export async function getGeoBreakdown(
  entityId: string,
  startDate: string,
  endDate: string,
  topN?: number
): Promise<any> {
  await ensureSession();
  return mcpCall("tools/call", {
    name: "get_geo_breakdown",
    arguments: {
      entity_id: entityId,
      start_date: startDate,
      end_date: endDate,
      ...(topN ? { top_n: topN } : {}),
    },
  });
}

export async function getCreativePerformance(
  entityId: string,
  startDate: string,
  endDate: string,
  sortBy?: string,
  topN?: number
): Promise<any> {
  await ensureSession();
  return mcpCall("tools/call", {
    name: "get_creative_performance",
    arguments: {
      entity_id: entityId,
      start_date: startDate,
      end_date: endDate,
      ...(sortBy ? { sort_by: sortBy } : {}),
      ...(topN ? { top_n: topN } : {}),
    },
  });
}

// ── Status Check ────────────────────────────────────────────────────────────

export function isAuthenticated(): boolean {
  return tokenSet !== null && tokenSet.expiresAt > Date.now();
}

export function getAuthStatus(): {
  authenticated: boolean;
  expiresAt: number | null;
  hasRefreshToken: boolean;
} {
  return {
    authenticated: isAuthenticated(),
    expiresAt: tokenSet?.expiresAt ?? null,
    hasRefreshToken: !!tokenSet?.refreshToken,
  };
}

// ── Batch Pull for Reporting Dashboard ──────────────────────────────────────

export interface SpeedboatCampaignData {
  advertiser: string;
  entityId: string;
  spend: number;
  installs: number;
  cpi: number;
  roas: number;
  campaigns: Array<{
    name: string;
    status: string;
    budget: number;
    spend: number;
  }>;
  trends: Array<{
    date: string;
    spend: number;
    installs: number;
    cpi: number;
  }>;
  geoTop5: Array<{
    country: string;
    spend: number;
    installs: number;
  }>;
}

/**
 * Pull comprehensive Speedboat data for a single advertiser.
 * Returns null if auth fails or entity can't be resolved.
 */
export async function pullAdvertiserData(
  advertiserName: string,
  days: number = 30
): Promise<SpeedboatCampaignData | null> {
  if (!isAuthenticated()) return null;

  try {
    // Resolve entity
    const entityResult = await resolveEntity(advertiserName);
    const content = entityResult?.content;
    let entityId: string | null = null;

    if (Array.isArray(content)) {
      for (const c of content) {
        if (c.type === "text" && c.text) {
          try {
            const parsed = JSON.parse(c.text);
            entityId = parsed.entity_id || parsed.id;
          } catch {
            // Try extracting from plain text
            const match = c.text.match(/entity[_\s]?id[:\s]*["']?(\w+)/i);
            if (match) entityId = match[1];
          }
        }
      }
    }

    if (!entityId) {
      console.warn(`[Speedboat] Could not resolve entity: ${advertiserName}`);
      return null;
    }

    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

    // Pull all data in parallel
    const [perfResult, campaignResult, trendResult, geoResult] = await Promise.allSettled([
      getGtmPerformance(entityId, startDate, endDate),
      getCampaignDetails(entityId, startDate, endDate),
      getPerformanceTrends(entityId, startDate, endDate, "daily"),
      getGeoBreakdown(entityId, startDate, endDate, 5),
    ]);

    // Parse performance
    let spend = 0, installs = 0, cpi = 0, roas = 0;
    if (perfResult.status === "fulfilled" && perfResult.value?.content) {
      for (const c of perfResult.value.content) {
        if (c.type === "text") {
          try {
            const p = JSON.parse(c.text);
            spend = p.spend || p.total_spend || 0;
            installs = p.installs || p.total_installs || 0;
            cpi = p.cpi || (installs > 0 ? spend / installs : 0);
            roas = p.roas || 0;
          } catch { /* skip */ }
        }
      }
    }

    // Parse campaigns
    const campaigns: SpeedboatCampaignData["campaigns"] = [];
    if (campaignResult.status === "fulfilled" && campaignResult.value?.content) {
      for (const c of campaignResult.value.content) {
        if (c.type === "text") {
          try {
            const parsed = JSON.parse(c.text);
            const campList = parsed.campaigns || parsed.data || [];
            for (const camp of campList.slice(0, 10)) {
              campaigns.push({
                name: camp.name || camp.campaign_name || "Unknown",
                status: camp.status || "unknown",
                budget: camp.budget || camp.daily_budget || 0,
                spend: camp.spend || 0,
              });
            }
          } catch { /* skip */ }
        }
      }
    }

    // Parse trends
    const trends: SpeedboatCampaignData["trends"] = [];
    if (trendResult.status === "fulfilled" && trendResult.value?.content) {
      for (const c of trendResult.value.content) {
        if (c.type === "text") {
          try {
            const parsed = JSON.parse(c.text);
            const trendList = parsed.data || parsed.trends || [];
            for (const t of trendList.slice(0, 30)) {
              trends.push({
                date: t.date || "",
                spend: t.spend || 0,
                installs: t.installs || 0,
                cpi: t.cpi || 0,
              });
            }
          } catch { /* skip */ }
        }
      }
    }

    // Parse geo
    const geoTop5: SpeedboatCampaignData["geoTop5"] = [];
    if (geoResult.status === "fulfilled" && geoResult.value?.content) {
      for (const c of geoResult.value.content) {
        if (c.type === "text") {
          try {
            const parsed = JSON.parse(c.text);
            const geoList = parsed.countries || parsed.geo || parsed.data || [];
            for (const g of geoList.slice(0, 5)) {
              geoTop5.push({
                country: g.country || g.region || "Unknown",
                spend: g.spend || 0,
                installs: g.installs || 0,
              });
            }
          } catch { /* skip */ }
        }
      }
    }

    return {
      advertiser: advertiserName,
      entityId,
      spend,
      installs,
      cpi,
      roas,
      campaigns,
      trends,
      geoTop5,
    };
  } catch (err: any) {
    console.error(`[Speedboat] Error pulling data for ${advertiserName}:`, err.message);
    return null;
  }
}

/**
 * Pull data for all known CTV advertisers.
 * Returns whatever data is available — gracefully handles failures.
 */
export async function pullAllCtvAdvertiserData(): Promise<SpeedboatCampaignData[]> {
  const CTV_ADVERTISERS = [
    "CHAI",
    "Tang Luck",
    "Experian",
    "Fanatics",
    "Robinhood",
    "Novig",
    "ReelShort",
    "Kraken",
    "PMG",
  ];

  const results: SpeedboatCampaignData[] = [];

  // Pull sequentially to avoid rate limits
  for (const name of CTV_ADVERTISERS) {
    const data = await pullAdvertiserData(name);
    if (data) results.push(data);
  }

  return results;
}
