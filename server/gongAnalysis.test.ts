import { describe, it, expect, beforeAll } from "vitest";

/**
 * Gong Analysis LLM endpoint test — validates the AI-powered analysis
 * of CTV call transcripts from Gong.
 *
 * This test calls the actual endpoint (which hits Gong API + LLM),
 * so it has a long timeout. It validates the response structure and
 * data quality of the LLM analysis.
 */

// We test via HTTP since the endpoint is a tRPC procedure
const BASE = "http://localhost:3000/api/trpc";

interface GongAnalysisResponse {
  result: {
    data: {
      available: boolean;
      error?: string;
      analysis: {
        overall_sentiment?: {
          score: number;
          label: string;
          justification: string;
        };
        themes?: Array<{
          name: string;
          frequency: string;
          sentiment?: string;
          description?: string;
          evidence?: Array<{ advertiser: string; quote?: string; call_url?: string }>;
        }>;
        objections?: Array<{
          objection: string;
          frequency: string;
          typical_response?: string;
          evidence?: Array<{ advertiser: string; context?: string; call_url?: string }>;
        }>;
        competitive_mentions?: Array<{
          competitor: string;
          context: string;
          sentiment: string;
          call_url?: string;
          advertiser?: string;
        }>;
        verbatims?: Array<{
          quote: string;
          advertiser: string;
          context?: string;
          sentiment: string;
          call_url?: string;
          date?: string;
        }>;
        recommendations?: string[];
        parse_error?: boolean;
      } | null;
      source_calls?: Array<{
        advertiser: string;
        title: string;
        url: string;
        date: string;
        duration_min: number;
      }>;
      analyzed_at?: string;
      call_count?: number;
      transcript_count?: number;
    };
  };
}

let data: GongAnalysisResponse["result"]["data"];

beforeAll(async () => {
  const res = await fetch(`${BASE}/reporting.gongAnalysis`);
  const raw = await res.json();
  // tRPC + superjson wraps the response in result.data.json
  data = raw.result?.data?.json ?? raw.result?.data ?? raw;
}, 120_000); // LLM + Gong API can take up to 2 minutes

describe("Gong Analysis — Response Structure", () => {
  it("returns a response with available flag", () => {
    expect(data).toHaveProperty("available");
    expect(typeof data.available).toBe("boolean");
  });

  it("when available, has analysis object", () => {
    if (!data.available) {
      console.warn("Gong analysis not available — skipping analysis structure tests");
      return;
    }
    expect(data.analysis).toBeTruthy();
    expect(typeof data.analysis).toBe("object");
  });

  it("when available, has source_calls array", () => {
    if (!data.available) return;
    expect(Array.isArray(data.source_calls)).toBe(true);
    expect(data.source_calls!.length).toBeGreaterThan(0);
  });

  it("when available, has analyzed_at timestamp", () => {
    if (!data.available) return;
    expect(typeof data.analyzed_at).toBe("string");
    // Should be a valid ISO date
    expect(new Date(data.analyzed_at!).getTime()).toBeGreaterThan(0);
  });

  it("when available, has call_count and transcript_count", () => {
    if (!data.available) return;
    expect(typeof data.call_count).toBe("number");
    expect(data.call_count!).toBeGreaterThan(0);
    expect(typeof data.transcript_count).toBe("number");
    expect(data.transcript_count!).toBeGreaterThan(0);
  });
});

describe("Gong Analysis — LLM Analysis Quality", () => {
  it("analysis has overall_sentiment with score and label", () => {
    if (!data.available || !data.analysis) return;
    if (data.analysis.parse_error) {
      console.warn("LLM returned unparseable JSON — skipping quality tests");
      return;
    }
    const sentiment = data.analysis.overall_sentiment;
    expect(sentiment).toBeTruthy();
    expect(typeof sentiment!.score).toBe("number");
    expect(sentiment!.score).toBeGreaterThanOrEqual(1);
    expect(sentiment!.score).toBeLessThanOrEqual(5);
    expect(typeof sentiment!.label).toBe("string");
    expect(sentiment!.label.length).toBeGreaterThan(0);
    expect(typeof sentiment!.justification).toBe("string");
  });

  it("analysis has themes array", () => {
    if (!data.available || !data.analysis || data.analysis.parse_error) return;
    expect(Array.isArray(data.analysis.themes)).toBe(true);
    if (data.analysis.themes!.length > 0) {
      const first = data.analysis.themes![0];
      expect(typeof first.name).toBe("string");
      expect(["high", "medium", "low"]).toContain(first.frequency);
    }
  });

  it("analysis has verbatims with real quotes", () => {
    if (!data.available || !data.analysis || data.analysis.parse_error) return;
    expect(Array.isArray(data.analysis.verbatims)).toBe(true);
    if (data.analysis.verbatims!.length > 0) {
      const first = data.analysis.verbatims![0];
      expect(typeof first.quote).toBe("string");
      expect(first.quote.length).toBeGreaterThan(10); // Real quotes are substantial
      expect(typeof first.advertiser).toBe("string");
      expect(typeof first.sentiment).toBe("string");
    }
  });

  it("analysis has recommendations array", () => {
    if (!data.available || !data.analysis || data.analysis.parse_error) return;
    expect(Array.isArray(data.analysis.recommendations)).toBe(true);
    expect(data.analysis.recommendations!.length).toBeGreaterThan(0);
    data.analysis.recommendations!.forEach((r) => {
      expect(typeof r).toBe("string");
      expect(r.length).toBeGreaterThan(10);
    });
  });
});

describe("Gong Analysis — Source Call Attribution", () => {
  it("source_calls have valid Gong URLs", () => {
    if (!data.available || !data.source_calls) return;
    data.source_calls.forEach((call) => {
      expect(typeof call.url).toBe("string");
      expect(call.url).toMatch(/gong\.io/);
      expect(typeof call.advertiser).toBe("string");
      expect(typeof call.title).toBe("string");
      expect(typeof call.date).toBe("string");
      expect(typeof call.duration_min).toBe("number");
    });
  });

  it("transcript_count matches source_calls length", () => {
    if (!data.available || !data.source_calls) return;
    expect(data.transcript_count).toBe(data.source_calls.length);
  });
});
