# Upgrade Notes

## Current State (d719be15)
- App is running, 22 tests pass
- Apple white glassy UI with frosted glass panels
- 7 main pages: NeuralCommand, AgentSwarm, ApprovalQueue, DataPulse, WarRoom, BuyerSim + legacy pages
- LLM execution is wired (llm.ts → AgentContext.runAgent → executeAgentPrompt)
- AgentSwarm has expandable panels with output display
- NeuralShell has mobile bottom nav + slide-over menu
- Command palette component exists (cmdk) but not wired
- Toaster (sonner) is mounted but not used for agent events
- No global keyboard shortcuts
- No streaming - full response only
- Agent output displayed as plain text, not markdown

## Phase 1: Wire real LLM + streaming
- LLM client already calls Forge API correctly
- Need to add streaming support to callLLM
- Need to update AgentContext to support progressive output updates
- Add toast notifications on agent complete/fail

## Phase 2: Command Palette + Shortcuts
- cmdk component exists at components/ui/command.tsx
- Need CommandPalette wrapper with Cmd+K shortcut
- Wire to agent search + execute, page navigation, actions

## Phase 3: Agent Swarm Upgrade
- Already has list/grid views, expandable panels
- Need markdown rendering for outputs (Streamdown)
- Need better shimmer loading states
- Need execution history per agent

## Phase 4: Buyer Sim Polish
- Has 4 personas with deep conversations
- Need auto-play with typing animation
- Need interactive chat mode with real LLM

## Phase 5: Micro-interactions
- Already has framer-motion springs
- Need more shimmer, stagger, parallax effects
- Need better page transitions
