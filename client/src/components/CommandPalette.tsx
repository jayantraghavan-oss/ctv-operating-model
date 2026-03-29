/**
 * CommandPalette — Global Cmd+K command palette.
 * Search agents, navigate pages, execute actions.
 * Apple-level polish with glassy backdrop and spring animations.
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAgent } from "@/contexts/AgentContext";
import { prompts, modules } from "@/lib/data";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Brain, Zap, Shield, Radio, Crosshair, MessageSquare, Network,
  Play, Search, ArrowRight, Sparkles, BarChart3, BookOpen,
  Target, Radar, Megaphone, Users,
} from "lucide-react";
import { toast } from "sonner";

const moduleIcons = [Radar, Megaphone, Users, BarChart3];

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [, navigate] = useLocation();
  const { runAgent } = useAgent();

  // Global keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  const navigateTo = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
  }, [navigate, setOpen]);

  const executeAgent = useCallback((prompt: typeof prompts[0]) => {
    // Find the sub-module for this prompt
    let subModule = "Orchestration";
    let owner = "agent";
    for (const mod of modules) {
      if (mod.id !== prompt.moduleId) continue;
      for (const section of mod.sections) {
        for (const sub of section.subModules) {
          if (sub.prompts.includes(prompt.id)) {
            subModule = sub.name;
            owner = sub.owner;
            break;
          }
        }
      }
    }
    runAgent(prompt.id, prompt.text, prompt.moduleId, subModule, prompt.agentType, owner);
    setOpen(false);
    toast(`Running Assistant #${prompt.id}`, {
      description: prompt.text.slice(0, 80) + "...",
      duration: 2000,
    });
  }, [runAgent, setOpen]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton={false}>
      <CommandInput placeholder="Search assistants, pages, actions... (⌘K)" />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <Search className="w-8 h-8 text-foreground/15" />
            <span className="text-sm text-foreground/40">No results found</span>
          </div>
        </CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => navigateTo("/")}>
            <Network className="w-4 h-4 text-primary" />
            <span>Control Center</span>
            <span className="ml-auto text-xs text-foreground/25">Home</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo("/dashboard")}>
            <Brain className="w-4 h-4 text-primary" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo("/swarm")}>
            <Zap className="w-4 h-4 text-amber-500" />
            <span>AI Assistants</span>
            <span className="ml-auto text-xs text-foreground/25">200 assistants</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo("/approvals")}>
            <Shield className="w-4 h-4 text-violet-500" />
            <span>Approval Queue</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo("/data-pulse")}>
            <Radio className="w-4 h-4 text-emerald-500" />
            <span>Insights</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo("/war-room")}>
            <Crosshair className="w-4 h-4 text-rose-500" />
            <span>Competitive Sims</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo("/simulation")}>
            <MessageSquare className="w-4 h-4 text-violet-500" />
            <span>Buyer Roleplay</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Modules */}
        <CommandGroup heading="Modules">
          {modules.map((mod, i) => {
            const Icon = moduleIcons[i];
            return (
              <CommandItem key={mod.id} onSelect={() => navigateTo(`/module/${mod.id}`)}>
                <Icon className="w-4 h-4 text-primary" />
                <span>M{mod.id}: {mod.shortName}</span>
                <span className="ml-auto text-xs text-foreground/25">{mod.sections.length} sections</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => {
            // Execute top 5 agents
            prompts.slice(0, 5).forEach((p, i) => {
              setTimeout(() => executeAgent(p), i * 800);
            });
          }}>
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Run Top 5 Assistants</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo("/")}>
            <BookOpen className="w-4 h-4 text-foreground/40" />
            <span>View Reference Guide</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Agent Search — show first 20 matching */}
        <CommandGroup heading="Run Assistant">
          {prompts.slice(0, 20).map((prompt) => (
            <CommandItem
              key={prompt.id}
              onSelect={() => executeAgent(prompt)}
              value={`agent ${prompt.id} ${prompt.text} m${prompt.moduleId}`}
            >
              <Play className="w-3.5 h-3.5 text-foreground/30" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono text-foreground/20 mr-2">#{prompt.id}</span>
                <span className="text-sm truncate">{prompt.text.slice(0, 70)}</span>
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                prompt.moduleId === 1 ? "bg-blue-50 text-blue-600" :
                prompt.moduleId === 2 ? "bg-violet-50 text-violet-600" :
                prompt.moduleId === 3 ? "bg-emerald-50 text-emerald-600" :
                "bg-amber-50 text-amber-600"
              }`}>M{prompt.moduleId}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
