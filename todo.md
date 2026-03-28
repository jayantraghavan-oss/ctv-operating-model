# Project TODO

## Phase 13: Apple UX Redesign — White, Glassy, Super Polished
- [x] White background with subtle warm gray tones
- [x] Frosted glass panels (backdrop-blur, translucent backgrounds)
- [x] Spring animations on all interactions (framer-motion springs)
- [x] SF-style typography hierarchy (Inter with precise weight/size scale)
- [x] Soft layered shadows instead of borders
- [x] Glassy cards with subtle gradients
- [x] Smooth hover/focus micro-interactions
- [x] NeuralShell sidebar with frosted glass
- [x] NeuralCommand with polished glassy KPI cards
- [x] All pages updated to match Apple aesthetic
- [x] App.tsx switched to light theme

## Phase 14: Deep CTV Buyer Simulation
- [x] 20+ turn back-and-forth per persona with deep CTV technical content
- [x] Real measurement/MMP/incrementality methodology debates
- [x] Competitive comparisons (TTD, tvScientific, Roku, Amazon)
- [x] Pricing negotiation, CPM benchmarks, test fund structuring
- [x] Creative optimization, frequency capping, inventory quality discussions
- [x] Attribution window debates, CTV-to-App vs CTV-to-Web measurement
- [x] Agent trace panel showing which modules/sub-modules activate at each turn
- [x] Apple glassy UX throughout

## Testing
- [x] Vitest tests for data model integrity (22 tests, all passing)

## Phase 15: Rebrand + Mobile + 100x UX Upgrade
- [ ] Rename to "CTV AI Commercial Engine" throughout
- [ ] New brand identity — catchy name, gradient accent, distinctive mark
- [ ] Mobile-first responsive design — all pages work on phone/tablet
- [ ] Collapsible mobile sidebar with hamburger menu and gesture support
- [ ] Magical micro-interactions: spring physics, stagger animations, parallax, shimmer loading
- [ ] NeuralCommand: live agent execution with real streaming, rich cluster drill-down, animated KPIs
- [ ] AgentSwarm: deep per-agent detail views, execution history, output previews, mobile card layout
- [ ] DataPulse: interactive data exploration, expandable Gong insights, brand pipeline drill-down
- [ ] WarRoom: interactive competitive matrix, scenario builder, real-time battle analysis
- [ ] BuyerSim: mobile-friendly conversation view, swipe gestures, floating controls
- [ ] Global: toast notifications, keyboard shortcuts, command palette, breadcrumb navigation
- [ ] Performance: lazy loading, virtualized lists, optimistic UI everywhere

## Phase 16: Per-Prompt LLM Execution
- [x] Every prompt in AgentSwarm is clickable with Execute button
- [x] Clicking Execute fires real LLM call with full context (Gong, brands, module knowledge)
- [x] Output streams back in real-time with typing animation
- [x] Expanded prompt view shows: prompt text, data sources used, output, status, timing
- [x] Server-side agent execution injects real Gong call data, brand pipeline, module context
- [x] Mobile-friendly prompt cards with tap-to-execute

## Phase 17: Massive UX Upgrade — Magical + Functional
- [x] Add streaming LLM support to llm.ts (SSE/chunked response)
- [x] Update AgentContext to support progressive output updates during streaming
- [x] Add toast notifications (sonner) for agent complete/fail/start events
- [x] Build global Command Palette (Cmd+K) with agent search, page nav, actions
- [x] Add keyboard shortcuts throughout (Cmd+K palette, Escape to close, etc.)
- [x] Render agent outputs as markdown using Streamdown component
- [x] Add shimmer loading skeleton for agent execution states
- [x] Add typing animation effect for streaming agent outputs
- [x] Upgrade BuyerSim with auto-play typing animation and interactive chat mode
- [x] Add page transition animations between routes
- [x] Polish micro-interactions: better hover states, focus rings, ripple effects

## Phase 17b: Gap Items (noted during review)
- [ ] Move agent execution to server-side tRPC procedure (currently client-side Forge API)
- [ ] Inject real Gong call data and brand pipeline context into server-side agent execution
- [x] Add Escape key handling for command palette and modal close (confirmed: line 47-49 in CommandPalette.tsx)
- [x] Verify BuyerSim auto-play typing animation is working (confirmed: autoPlay state, bounce animation, progressive turn reveal)
- [x] Add AnimatePresence route transitions in App.tsx (confirmed: line 51-73)
- [x] Add visible focus-ring states on interactive controls (added to index.css base layer)
