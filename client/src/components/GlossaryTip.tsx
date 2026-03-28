/**
 * GlossaryTip — Shows a user-friendly label with a hover tooltip
 * revealing the technical term (e.g., "Always-On" → hover shows "aka Persistent Agent").
 * Uses Radix Tooltip for consistent behavior.
 */
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GlossaryTipProps {
  /** The friendly, user-facing label */
  label: string;
  /** The technical term shown on hover (e.g., "Persistent Agent") */
  technical: string;
  /** Optional extra className for the label span */
  className?: string;
  /** Whether to show as inline or block */
  inline?: boolean;
}

export default function GlossaryTip({ label, technical, className = "", inline = true }: GlossaryTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`${inline ? "inline" : "block"} cursor-help border-b border-dotted border-current/20 ${className}`}
        >
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-foreground text-background text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg"
      >
        aka {technical}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Terminology mapping for consistent use across the app.
 * Import this wherever you need to translate technical → friendly terms.
 */
export const TERMINOLOGY = {
  // Agent types
  agentType: {
    persistent: { friendly: "Always-On", technical: "Persistent Agent" },
    triggered: { friendly: "On-Demand", technical: "Triggered Agent" },
    orchestrator: { friendly: "Coordinator", technical: "Orchestrator Agent" },
  },
  // Ownership models
  ownership: {
    agent: { friendly: "AI-Driven", technical: "Agent-Owned" },
    "agent-human": { friendly: "AI + Review", technical: "Agent+Human" },
    "human-led": { friendly: "Human-Led", technical: "Human-Led" },
  },
  // Page names
  pages: {
    home: { friendly: "Dashboard", technical: "Command Center" },
    swarm: { friendly: "AI Assistants", technical: "Agent Swarm" },
    approvals: { friendly: "Approvals", technical: "Approval Queue" },
    dataPulse: { friendly: "Insights", technical: "Data Pulse" },
    warRoom: { friendly: "Competitive Scenarios", technical: "War Room" },
    simulation: { friendly: "Buyer Roleplay", technical: "Buyer Simulation" },
    model: { friendly: "Operating Model", technical: "Model Overview" },
    agents: { friendly: "Agent Registry", technical: "Agent Registry" },
  },
  // Actions
  actions: {
    execute: { friendly: "Run", technical: "Execute" },
    deploy: { friendly: "Start", technical: "Deploy" },
    deployAll: { friendly: "Run All", technical: "Deploy All / Go Live" },
    rerun: { friendly: "Re-run", technical: "Re-execute" },
    simulate: { friendly: "Simulate", technical: "Run Simulation" },
    autopilot: { friendly: "Auto Mode", technical: "Autopilot" },
  },
} as const;

/** Helper to get friendly agent type label */
export function friendlyAgentType(type: string): string {
  return TERMINOLOGY.agentType[type as keyof typeof TERMINOLOGY.agentType]?.friendly || type;
}

/** Helper to get technical agent type label */
export function technicalAgentType(type: string): string {
  return TERMINOLOGY.agentType[type as keyof typeof TERMINOLOGY.agentType]?.technical || type;
}

/** Helper to get friendly ownership label */
export function friendlyOwnership(owner: string): string {
  return TERMINOLOGY.ownership[owner as keyof typeof TERMINOLOGY.ownership]?.friendly || owner;
}

/** Helper to get technical ownership label */
export function technicalOwnership(owner: string): string {
  return TERMINOLOGY.ownership[owner as keyof typeof TERMINOLOGY.ownership]?.technical || owner;
}
