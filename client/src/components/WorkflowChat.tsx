/**
 * WorkflowChat — Live buyer roleplay chat that opens after workflow execution.
 * The AI plays a CTV buyer persona grounded in the workflow's agent outputs.
 * User plays the Moloco seller, going back-and-forth in a real conversation.
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, User, Bot, X, Loader2,
  Zap, Shield, BarChart3, Radar, Brain, ChevronDown,
  RotateCcw, Save, CheckCircle2, Sparkles, ArrowDown,
} from "lucide-react";
import { callLLMStream, type LLMMessage } from "@/lib/llm";
import { Streamdown } from "streamdown";

// ── Types ──────────────────────────────────────────────────────────────

interface AgentTrace {
  moduleId: number;
  moduleName: string;
  subModule: string;
  action: string;
  confidence: number;
}

interface ChatMessage {
  id: string;
  role: "buyer" | "seller" | "system";
  text: string;
  timestamp: Date;
  traces?: AgentTrace[];
  isStreaming?: boolean;
}

interface BuyerPersona {
  name: string;
  title: string;
  company: string;
  vertical: string;
  budget: string;
  kpis: string[];
  objections: string[];
}

interface WorkflowChatProps {
  open: boolean;
  onClose: () => void;
  scenarioName: string;
  scenarioDescription: string;
  /** Compiled agent outputs from the workflow execution */
  agentOutputs: { nodeName: string; output: string; moduleId?: number }[];
  /** Optional: save the chat session */
  onSaveSession?: (messages: ChatMessage[]) => void;
}

// ── Module icons ──
const moduleIcons: Record<number, typeof Radar> = {
  1: Radar,
  2: Zap,
  3: BarChart3,
  4: Shield,
};

const moduleNames: Record<number, string> = {
  1: "Market Intelligence",
  2: "Pipeline & Activation",
  3: "Sales Execution",
  4: "Customer Success",
};

const spring = { type: "spring" as const, stiffness: 400, damping: 30 };

function genId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Infer buyer persona from scenario ──
function inferPersona(scenarioName: string, scenarioDescription: string): BuyerPersona {
  const lower = (scenarioName + " " + scenarioDescription).toLowerCase();

  if (lower.includes("gaming") || lower.includes("app") || lower.includes("mobile")) {
    return {
      name: "Sarah Chen",
      title: "VP Growth",
      company: "TopPlay Games",
      vertical: "Mobile Gaming",
      budget: "$500K test → $2M annual",
      kpis: ["ROAS > 3.0x", "Incremental lift > 15%", "CPI < $8"],
      objections: ["TTD has years of CTV data", "Incrementality methodology unclear", "ML black box concern"],
    };
  }
  if (lower.includes("dtc") || lower.includes("ecommerce") || lower.includes("brand") || lower.includes("skincare") || lower.includes("retail")) {
    return {
      name: "Marcus Rivera",
      title: "CMO",
      company: "GlowUp Skincare",
      vertical: "DTC E-commerce",
      budget: "$150K test budget",
      kpis: ["CAC < $45", "Brand lift > 8%", "ROAS > 2.0x"],
      objections: ["CTV is new for us", "Attribution is unclear", "Budget is tight"],
    };
  }
  if (lower.includes("agency") || lower.includes("programmatic") || lower.includes("media")) {
    return {
      name: "Priya Patel",
      title: "Director of Programmatic",
      company: "MediaForce Agency",
      vertical: "Agency (multi-vertical)",
      budget: "$2M across 12 clients",
      kpis: ["Client retention > 95%", "Campaign setup < 2hrs", "Cross-client reporting"],
      objections: ["Need full self-serve", "Reporting must match TTD", "Managed service doesn't scale"],
    };
  }
  if (lower.includes("rmn") || lower.includes("network") || lower.includes("commerce media")) {
    return {
      name: "David Kim",
      title: "VP Ad Products",
      company: "ShopStream",
      vertical: "Retail Media Network",
      budget: "$500K pilot for 5 advertisers",
      kpis: ["Advertiser ROAS > 4x", "Data match rate > 65%", "Incremental lift > 5%"],
      objections: ["Amazon DSP is the default", "Clean room integration complexity", "Need white-label capability"],
    };
  }

  // Default — generic CTV buyer
  return {
    name: "Alex Morgan",
    title: "Head of Performance Marketing",
    company: "ScaleUp Inc.",
    vertical: "Performance Marketing",
    budget: "$250K quarterly",
    kpis: ["ROAS > 2.5x", "Incremental reach", "Cross-screen attribution"],
    objections: ["Already using TTD", "Need to prove incrementality", "CTV measurement is immature"],
  };
}

// ── Build system prompt for the buyer AI ──
function buildBuyerSystemPrompt(persona: BuyerPersona, agentOutputs: { nodeName: string; output: string; moduleId?: number }[]): string {
  const briefing = agentOutputs
    .map((a) => `### ${a.nodeName}\n${a.output.slice(0, 800)}`)
    .join("\n\n");

  return `You are ${persona.name}, ${persona.title} at ${persona.company}. You are a sophisticated CTV advertising buyer in the ${persona.vertical} vertical.

## Your Profile
- **Budget**: ${persona.budget}
- **KPIs**: ${persona.kpis.join(", ")}
- **Key Objections**: ${persona.objections.join("; ")}

## Your Behavior
- You are evaluating Moloco's CTV advertising platform for your company
- You are intelligent, well-informed, and ask probing technical questions
- You push back on vague claims — you want data, benchmarks, and proof points
- You compare Moloco against competitors (TTD, Amazon DSP, Roku OneView, tvScientific)
- You care about: measurement/attribution, incrementality, brand safety, creative optimization, pricing
- You respond naturally in 2-4 paragraphs per message. Be conversational but substantive.
- Occasionally reference your own experience: "At ${persona.company}, we've seen..." or "Our ${persona.title.toLowerCase()} team needs..."
- You gradually warm up if the seller provides good answers, but stay skeptical on weak points
- You are NOT a pushover — challenge assumptions, ask for case studies, demand specifics

## Context
The Moloco seller's team has prepared the following briefing materials (from their AI agents) before this meeting. You have NOT seen these — the seller will present relevant parts during the conversation. But you should ask questions that naturally lead to these topics:

${briefing}

## Conversation Rules
- Start by introducing yourself and stating what you're looking for
- Ask about 1-2 topics per message, don't overwhelm
- React to the seller's points before asking new questions
- If the seller gives a strong answer, acknowledge it before moving on
- If the seller is vague, push harder: "Can you be more specific about..."
- After 8-10 exchanges, start moving toward next steps or deal structure
- Always stay in character as ${persona.name}

## Response Format
Respond ONLY as ${persona.name}. Do not break character. Do not add metadata or JSON.
After your response text, on a NEW LINE, add a JSON block wrapped in \`\`\`traces\`\`\` fences listing 1-3 agent modules that would activate to help the seller respond. Format:
\`\`\`traces
[{"moduleId": 1, "moduleName": "Market Intelligence", "subModule": "Competitive Landscape", "action": "Pull TTD comparison data", "confidence": 85}]
\`\`\``;
}

// ── Parse traces from buyer response ──
function parseTracesFromResponse(text: string): { cleanText: string; traces: AgentTrace[] } {
  const traceMatch = text.match(/```traces\s*\n?([\s\S]*?)```/);
  let traces: AgentTrace[] = [];
  let cleanText = text;

  if (traceMatch) {
    cleanText = text.replace(/```traces\s*\n?[\s\S]*?```/, "").trim();
    try {
      traces = JSON.parse(traceMatch[1].trim());
    } catch {
      // If parsing fails, no traces
    }
  }

  return { cleanText, traces };
}

// ── Component ──────────────────────────────────────────────────────────

export default function WorkflowChat({
  open,
  onClose,
  scenarioName,
  scenarioDescription,
  agentOutputs,
  onSaveSession,
}: WorkflowChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showTraces, setShowTraces] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<LLMMessage[]>([]);
  const hasInitialized = useRef(false);

  const persona = useMemo(
    () => inferPersona(scenarioName, scenarioDescription),
    [scenarioName, scenarioDescription]
  );

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages]);

  // Track scroll position for "scroll to bottom" button
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      setShowScrollDown(!isNearBottom && messages.length > 2);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [messages.length]);

  // Initialize conversation when opened
  useEffect(() => {
    if (open && !hasInitialized.current && agentOutputs.length > 0) {
      hasInitialized.current = true;
      setMessages([]);
      setIsSaved(false);
      conversationRef.current = [];

      // Build system prompt
      const systemPrompt = buildBuyerSystemPrompt(persona, agentOutputs);
      conversationRef.current = [{ role: "system", content: systemPrompt }];

      // Add system message
      setMessages([
        {
          id: genId(),
          role: "system",
          text: `Roleplay started. You are the Moloco CTV seller. ${persona.name} (${persona.title}, ${persona.company}) is about to join the call. Your team's AI agents have prepared briefing materials from the workflow. Use them to respond to the buyer's questions.`,
          timestamp: new Date(),
        },
      ]);

      // Get the buyer's opening message
      setTimeout(() => getBuyerResponse("Start the conversation by introducing yourself and what you're looking for from this meeting."), 800);
    }
  }, [open, agentOutputs, persona]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      hasInitialized.current = false;
    }
  }, [open]);

  const getBuyerResponse = useCallback(
    async (userPrompt?: string) => {
      setIsThinking(true);

      // Add a placeholder streaming message
      const buyerMsgId = genId();
      setMessages((prev) => [
        ...prev,
        {
          id: buyerMsgId,
          role: "buyer",
          text: "",
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);

      try {
        // Build messages for LLM
        const llmMessages: LLMMessage[] = [
          ...conversationRef.current,
          ...(userPrompt
            ? [{ role: "user" as const, content: userPrompt }]
            : []),
        ];

        const result = await callLLMStream(llmMessages, (chunk, accumulated) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === buyerMsgId
                ? { ...m, text: accumulated, isStreaming: true }
                : m
            )
          );
        });

        // Parse traces from the final response
        const { cleanText, traces } = parseTracesFromResponse(result.content);

        // Update the message with clean text and traces
        setMessages((prev) =>
          prev.map((m) =>
            m.id === buyerMsgId
              ? { ...m, text: cleanText, isStreaming: false, traces }
              : m
          )
        );

        // Update conversation history
        conversationRef.current.push({
          role: "assistant",
          content: result.content,
        });
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === buyerMsgId
              ? {
                  ...m,
                  text: `*[Connection issue — ${persona.name} will rejoin shortly. Try sending another message.]*`,
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsThinking(false);
      }
    },
    [persona]
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isThinking) return;

    // Add seller message
    const sellerMsg: ChatMessage = {
      id: genId(),
      role: "seller",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, sellerMsg]);
    setInput("");

    // Update conversation history
    conversationRef.current.push({ role: "user", content: text });

    // Get buyer response
    getBuyerResponse();
  }, [input, isThinking, getBuyerResponse]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleReset = useCallback(() => {
    hasInitialized.current = false;
    setMessages([]);
    setInput("");
    setIsSaved(false);
    conversationRef.current = [];

    // Re-initialize
    setTimeout(() => {
      hasInitialized.current = true;
      const systemPrompt = buildBuyerSystemPrompt(persona, agentOutputs);
      conversationRef.current = [{ role: "system", content: systemPrompt }];
      setMessages([
        {
          id: genId(),
          role: "system",
          text: `Roleplay restarted. ${persona.name} is re-joining the call.`,
          timestamp: new Date(),
        },
      ]);
      setTimeout(() => getBuyerResponse("Start the conversation by introducing yourself and what you're looking for from this meeting."), 800);
    }, 100);
  }, [persona, agentOutputs, getBuyerResponse]);

  const handleSave = useCallback(() => {
    if (onSaveSession) {
      onSaveSession(messages);
      setIsSaved(true);
    }
  }, [messages, onSaveSession]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  const turnCount = messages.filter((m) => m.role === "buyer" || m.role === "seller").length;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

        {/* Chat panel */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={spring}
          className="relative w-full max-w-4xl h-[90vh] sm:h-[85vh] rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "oklch(1 0 0 / 0.97)",
            backdropFilter: "blur(24px) saturate(1.5)",
            boxShadow: "0 24px 80px oklch(0 0 0 / 0.18), 0 2px 8px oklch(0 0 0 / 0.06)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-black/[0.06] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200/50 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-violet-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-bold text-foreground truncate">
                    {persona.name}
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                    Live
                  </span>
                </div>
                <p className="text-[12px] text-foreground/40 truncate">
                  {persona.title}, {persona.company} · {persona.vertical}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
              <button
                onClick={() => setShowTraces(!showTraces)}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                  showTraces
                    ? "bg-violet-50 border-violet-200 text-violet-700"
                    : "bg-transparent border-black/[0.06] text-foreground/40 hover:text-foreground/60"
                }`}
              >
                <Brain className="w-3 h-3" />
                <span className="hidden sm:inline">AI Traces</span>
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-black/[0.06] text-foreground/40 hover:text-foreground/60 hover:bg-black/[0.02] transition-all"
                aria-label="Reset conversation"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
              {onSaveSession && (
                <button
                  onClick={handleSave}
                  disabled={isSaved || messages.length < 3}
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    isSaved
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-600"
                      : "bg-primary text-white hover:bg-primary/90 disabled:opacity-30"
                  }`}
                >
                  {isSaved ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3" />
                      <span className="hidden sm:inline">Save</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] flex items-center justify-center transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4 text-foreground/40" />
              </button>
            </div>
          </div>

          {/* ── Scenario context bar ── */}
          <div className="px-4 sm:px-6 py-2 bg-primary/[0.03] border-b border-primary/10 shrink-0">
            <div className="flex items-center gap-2 text-[11px]">
              <Sparkles className="w-3 h-3 text-primary shrink-0" />
              <span className="text-primary/70 font-medium truncate">
                Workflow: {scenarioName}
              </span>
              <span className="text-foreground/20">·</span>
              <span className="text-foreground/30">
                {agentOutputs.length} agents briefed
              </span>
              <span className="text-foreground/20">·</span>
              <span className="text-foreground/30">{turnCount} turns</span>
            </div>
          </div>

          {/* ── Messages ── */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 relative"
          >
            <AnimatePresence>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={spring}
                >
                  {m.role === "system" ? (
                    <div className="text-center py-2">
                      <span className="text-[11px] text-foreground/30 bg-black/[0.02] px-3 py-1 rounded-full border border-black/[0.04]">
                        {m.text}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`flex gap-3 ${m.role === "seller" ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          m.role === "buyer"
                            ? "bg-violet-100 border border-violet-200"
                            : "bg-blue-100 border border-blue-200"
                        }`}
                      >
                        {m.role === "buyer" ? (
                          <User className="w-4 h-4 text-violet-600" />
                        ) : (
                          <Bot className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="max-w-[85%] sm:max-w-[80%] space-y-2 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] text-foreground/30">
                          <span className="font-medium">
                            {m.role === "buyer" ? persona.name : "You (Moloco Seller)"}
                          </span>
                          <span>
                            {m.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                            m.role === "buyer"
                              ? "bg-violet-50/80 border border-violet-100/50 text-foreground"
                              : "bg-primary/[0.06] border border-primary/10 text-foreground/90"
                          }`}
                        >
                          {m.isStreaming && !m.text ? (
                            <span className="inline-flex gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" />
                              <span
                                className="w-2 h-2 rounded-full bg-violet-300 animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              />
                              <span
                                className="w-2 h-2 rounded-full bg-violet-300 animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              />
                            </span>
                          ) : m.role === "buyer" ? (
                            <Streamdown>{m.text}</Streamdown>
                          ) : (
                            <Streamdown>{m.text}</Streamdown>
                          )}
                        </div>

                        {/* Agent traces */}
                        {showTraces && m.traces && m.traces.length > 0 && !m.isStreaming && (
                          <div className="ml-1 space-y-1">
                            {m.traces.map((t, i) => {
                              const Icon = moduleIcons[t.moduleId] || Zap;
                              return (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                  className="flex items-start gap-2 px-3 py-1.5 rounded-lg border border-violet-100/50 bg-violet-50/30 text-[10px]"
                                >
                                  <Icon className="w-3 h-3 mt-0.5 shrink-0 text-violet-500" />
                                  <div className="min-w-0">
                                    <span className="font-medium text-violet-700">
                                      M{t.moduleId}: {t.subModule}
                                    </span>
                                    <span className="text-violet-500/70 ml-1.5">
                                      {t.action}
                                    </span>
                                    <span className="text-violet-400 ml-1.5">
                                      ({t.confidence}%)
                                    </span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Thinking indicator */}
            {isThinking && messages[messages.length - 1]?.role !== "buyer" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-violet-600" />
                </div>
                <div className="bg-violet-50/80 border border-violet-100/50 rounded-2xl px-4 py-3">
                  <span className="inline-flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </motion.div>
            )}

            {/* Scroll to bottom button */}
            <AnimatePresence>
              {showScrollDown && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={scrollToBottom}
                  className="sticky bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-black/[0.08] shadow-lg flex items-center justify-center hover:bg-black/[0.02] transition-colors z-10"
                >
                  <ArrowDown className="w-4 h-4 text-foreground/40" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* ── Input bar ── */}
          <div className="px-4 sm:px-6 py-3 border-t border-black/[0.06] shrink-0 bg-white/80">
            <div className="flex items-end gap-2 sm:gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Respond as the Moloco seller... (Enter to send, Shift+Enter for new line)"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-black/[0.08] bg-black/[0.015] text-[13px] text-foreground placeholder:text-foreground/25 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                  rows={input.includes("\n") ? Math.min(input.split("\n").length + 1, 5) : 2}
                  disabled={isThinking}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
                className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
                aria-label="Send message"
              >
                {isThinking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className="text-[10px] text-foreground/20">
                You are the Moloco CTV seller. Use your team's briefing to answer {persona.name}'s questions.
              </p>
              <span className="text-[10px] text-foreground/20">
                {turnCount} turns
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
