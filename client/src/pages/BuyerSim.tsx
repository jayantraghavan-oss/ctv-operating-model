import NeuralShell from "@/components/NeuralShell";
import { useAgent } from "@/contexts/AgentContext";
import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, User, Bot, RotateCcw, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message { id: string; role: "buyer" | "seller" | "system"; text: string; timestamp: Date; }

const PERSONAS = [
  { id: "gaming-vp", name: "VP Growth, Gaming Studio", company: "TopPlay Games", budget: "$500K", priority: "ROAS at scale", objections: ["Brand safety concerns", "Need incrementality proof", "Already using TTD"] },
  { id: "dtc-cmo", name: "CMO, DTC Brand", company: "GlowUp Skincare", budget: "$150K", priority: "Customer acquisition cost", objections: ["CTV is new for us", "How does attribution work?", "Budget is tight"] },
  { id: "agency-dir", name: "Director of Programmatic", company: "MediaForce", budget: "$2M across clients", priority: "Platform capabilities & scale", objections: ["Need self-serve", "Reporting requirements", "Multiple verticals"] },
  { id: "retail-svp", name: "SVP Digital, Retail Media", company: "ShopStream Media", budget: "$1M+", priority: "Off-site CTV activation", objections: ["Complement Amazon?", "First-party data integration", "Measurement standards"] },
];

const INIT: Record<string, Message[]> = {
  "gaming-vp": [
    { id: "s1", role: "system", text: "You are Sarah Chen, VP Growth at TopPlay Games. Evaluating CTV DSPs for $500K test. Currently using TTD. KPI: ROAS.", timestamp: new Date() },
    { id: "a1", role: "seller", text: "Hi Sarah, thanks for taking the time. I know you're running a significant CTV program with TTD today. I'd love to show you how Moloco's ML engine is delivering 20-30% better ROAS for gaming advertisers. Can I walk you through some recent results?", timestamp: new Date() },
  ],
  "dtc-cmo": [
    { id: "s1", role: "system", text: "You are Marcus Rivera, CMO of GlowUp Skincare. CTV is new — you've been digital-first (Meta, Google). $150K test budget, need clear attribution.", timestamp: new Date() },
    { id: "a1", role: "seller", text: "Marcus, great to connect. DTC brands like yours are finding CTV drives 2-3x better brand recall than social, with measurable downstream conversions. Would it help if I walked through how our measurement works with your existing MMP?", timestamp: new Date() },
  ],
  "agency-dir": [
    { id: "s1", role: "system", text: "You are Priya Patel, Director of Programmatic at MediaForce. Managing CTV for 12 clients across gaming, DTC, entertainment.", timestamp: new Date() },
    { id: "a1", role: "seller", text: "Priya, thanks for the meeting. Managing CTV across 12 clients is complex. Moloco's ML adapts per-client vertical while giving unified reporting. What are the biggest pain points with your current stack?", timestamp: new Date() },
  ],
  "retail-svp": [
    { id: "s1", role: "system", text: "You are David Kim, SVP Digital at ShopStream Media. Building retail media CTV offering, need DSP partner for off-site activation. Amazon is benchmark.", timestamp: new Date() },
    { id: "a1", role: "seller", text: "David, building a CTV offering for your retail media network is smart. Moloco can complement Amazon by activating your first-party shopper data across open-web CTV inventory. Want me to walk through the integration?", timestamp: new Date() },
  ],
};

const RESPONSES = [
  "That sounds interesting, but how does your ML actually work differently from TTD? They've been in CTV for years.",
  "What about brand safety? We've had issues with ads next to inappropriate content. Do you have GARM certification?",
  "Our current CPMs on TTD are $25-30. What should we expect? We can't justify a premium without clear data.",
  "How long does the ML need to optimize? We can't afford a long learning period with our test budget.",
  "Can you share case studies from our vertical? I need proof, not promises.",
  "What if the test doesn't hit our ROAS targets? Any performance guarantee?",
  "How does measurement work for CTV-to-App? We need the full funnel, not just impressions.",
  "We're also talking to tvScientific. They offer built-in incrementality. How do you compare?",
  "What does onboarding look like? How quickly can we go live?",
  "I'm concerned about scale. How much CTV inventory do you actually have?",
  "Our board wants incrementality, not last-touch attribution. Can Moloco prove incremental lift?",
  "We need self-serve. Our team can't rely on managed service for every campaign change.",
];

function genId() { return Math.random().toString(36).slice(2, 10); }

export default function BuyerSim() {
  const { runAgent } = useAgent();
  const [persona, setPersona] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showSelect, setShowSelect] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); }, [messages]);

  const start = (id: string) => { setPersona(id); setMessages(INIT[id] || []); setShowSelect(false); runAgent(800, `Buyer sim: ${id}`, 2, `buyer-sim-${id}`); };
  const reset = () => { setPersona(null); setMessages([]); setShowSelect(true); setInput(""); };

  const send = () => {
    if (!input.trim() || thinking) return;
    setMessages((p) => [...p, { id: genId(), role: "buyer", text: input.trim(), timestamp: new Date() }]);
    setInput(""); setThinking(true);
    setTimeout(() => {
      setMessages((p) => [...p, { id: genId(), role: "seller", text: RESPONSES[Math.floor(Math.random() * RESPONSES.length)], timestamp: new Date() }]);
      setThinking(false);
    }, 1500 + Math.random() * 2000);
  };

  const p = PERSONAS.find((x) => x.id === persona);

  return (
    <NeuralShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1"><MessageSquare className="w-6 h-6 text-violet-signal" /><h1 className="text-2xl font-semibold tracking-tight">Buyer Simulation</h1></div>
            <p className="text-sm text-muted-foreground">You are the customer. Experience the Moloco CTV pitch from the other side.</p>
          </div>
          {!showSelect && <button onClick={reset} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-all"><RotateCcw className="w-3 h-3" /> Reset</button>}
        </div>

        {showSelect ? (
          <div className="space-y-4">
            <div className="text-sm text-foreground/70">Choose your buyer persona:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PERSONAS.map((per) => (
                <button key={per.id} onClick={() => start(per.id)} className="border border-border rounded-lg bg-card p-5 text-left hover:border-violet-signal/30 hover:bg-accent/20 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-violet-signal/15 flex items-center justify-center"><User className="w-5 h-5 text-violet-signal" /></div>
                    <div><div className="text-sm font-medium text-foreground">{per.name}</div><div className="text-xs text-muted-foreground">{per.company}</div></div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="font-mono text-foreground">{per.budget}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><span className="text-foreground">{per.priority}</span></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5">LIKELY OBJECTIONS</div>
                    <div className="flex flex-wrap gap-1">{per.objections.map((o, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-rose-signal/10 text-rose-signal/80">{o}</span>)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col" style={{ height: "calc(100vh - 240px)" }}>
            {p && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 rounded-t-lg border border-border border-b-0">
                <div className="w-7 h-7 rounded-full bg-violet-signal/15 flex items-center justify-center"><User className="w-3.5 h-3.5 text-violet-signal" /></div>
                <span className="text-xs font-medium text-foreground">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.company} · {p.budget}</span>
              </div>
            )}
            <div ref={scrollRef} className="flex-1 overflow-y-auto border border-border rounded-b-lg bg-card p-4 space-y-3">
              <AnimatePresence>
                {messages.map((m) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${m.role === "buyer" ? "justify-end" : ""}`}>
                    {m.role !== "buyer" && <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.role === "system" ? "bg-muted" : "bg-neon/15"}`}>{m.role === "system" ? <Settings2 className="w-3.5 h-3.5 text-muted-foreground" /> : <Bot className="w-3.5 h-3.5 text-neon" />}</div>}
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.role === "buyer" ? "bg-violet-signal/15 text-foreground" : m.role === "system" ? "bg-muted text-muted-foreground text-xs italic" : "bg-muted/50 text-foreground/80"}`}>{m.text}</div>
                    {m.role === "buyer" && <div className="w-7 h-7 rounded-full bg-violet-signal/15 flex items-center justify-center shrink-0"><User className="w-3.5 h-3.5 text-violet-signal" /></div>}
                  </motion.div>
                ))}
              </AnimatePresence>
              {thinking && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-neon/15 flex items-center justify-center shrink-0"><Bot className="w-3.5 h-3.5 text-neon" /></div>
                  <div className="bg-muted/50 rounded-lg px-3 py-2"><span className="inline-flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" /><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} /><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} /></span></div>
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Respond as the buyer..." className="flex-1 px-4 py-2.5 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-signal" />
              <button onClick={send} disabled={!input.trim() || thinking} className="px-4 py-2.5 rounded-lg bg-violet-signal text-white text-sm font-medium hover:bg-violet-signal/90 transition-all disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </NeuralShell>
  );
}
