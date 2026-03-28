/**
 * Local stub for _core/llm — the deployment platform injects the real implementation.
 * This file exists only for local TypeScript resolution.
 * In production, invokeLLM calls the Forge API with BUILT_IN_FORGE_API_KEY.
 */

interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface InvokeLLMParams {
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: any;
  tools?: any[];
  tool_choice?: string | object;
}

interface LLMResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

export async function invokeLLM(params: InvokeLLMParams): Promise<LLMResponse> {
  const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.ai";
  const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY || "";

  const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FORGE_KEY}`,
    },
    body: JSON.stringify({
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 2000,
      ...(params.response_format ? { response_format: params.response_format } : {}),
      ...(params.tools ? { tools: params.tools } : {}),
      ...(params.tool_choice ? { tool_choice: params.tool_choice } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`LLM API error ${res.status}: ${errText}`);
  }

  return res.json();
}
