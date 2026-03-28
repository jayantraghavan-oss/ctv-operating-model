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
- [x] Rename to "CTV AI Commercial Engine" throughout (updated NeuralShell, Home, NeuralCommand)
- [x] New brand identity — CTV AI Engine with gradient brain icon, primary accent, distinctive mark (already in NeuralShell)
- [ ] Mobile-first responsive design — all pages work on phone/tablet
- [x] Collapsible mobile sidebar with hamburger menu and gesture support (already implemented: bottom nav + slide-over menu)
- [x] Magical micro-interactions: spring physics, stagger animations, parallax, shimmer loading (done in Phase 17)
- [x] NeuralCommand: live agent execution with real streaming, rich cluster drill-down, animated KPIs (streaming Streamdown output in live feed)
- [x] AgentSwarm: deep per-agent detail views, execution history, output previews, mobile card layout (done in Phase 16/17)
- [x] DataPulse: interactive data exploration, expandable Gong insights, brand pipeline drill-down (AI Analysis buttons on every insight + pipeline analysis)
- [x] WarRoom: interactive competitive matrix, scenario builder, real-time battle analysis (done in Phase 17)
- [ ] BuyerSim: mobile-friendly conversation view, swipe gestures, floating controls
- [x] Global: toast notifications, keyboard shortcuts, command palette, breadcrumb navigation (done in Phase 17)
- [x] Performance: lazy loading, virtualized lists, optimistic UI everywhere (lazy routes in App.tsx, Suspense boundaries)

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
- [x] Move agent execution to server-side /api/llm proxy (Vite middleware using BUILT_IN_FORGE_API_KEY)
- [ ] Inject real Gong call data and brand pipeline context into server-side agent execution (future: requires Gong API integration)
- [x] Add Escape key handling for command palette and modal close (confirmed: line 47-49 in CommandPalette.tsx)
- [x] Verify BuyerSim auto-play typing animation is working (confirmed: autoPlay state, bounce animation, progressive turn reveal)
- [x] Add AnimatePresence route transitions in App.tsx (confirmed: line 51-73)
- [x] Add visible focus-ring states on interactive controls (added to index.css base layer)

## Phase 18: Remove hardcoded DRI, make user dynamic
- [x] Remove hardcoded "Beth Berger" from NeuralShell sidebar (desktop + mobile)
- [x] Remove hardcoded "Beth Berger" from Home.tsx footer
- [x] Remove hardcoded "Beth Berger" from NeuralCommand.tsx footer
- [x] Show logged-in user name/initials when authenticated, show generic "Guest" or nothing when not

## Phase 18: Fix LLM API errors + Remove hardcoded DRI
- [x] Diagnose and fix LLM API errors when clicking Execute buttons (fixed: routed through /api/llm server proxy using BUILT_IN_FORGE_API_KEY)
- [x] Test every Execute button on every page (AgentSwarm, ModulePage, AgentRegistry, WarRoom, NeuralCommand, DataPulse) — all working
- [x] Remove hardcoded "Beth Berger" from NeuralShell sidebar (desktop + mobile)
- [x] Remove hardcoded "Beth Berger" from Home.tsx and NeuralCommand.tsx footers
- [x] Show logged-in user name/initials when authenticated, generic when not
- [x] Add Moloco logo to sidebar/header replacing Brain icon
- [x] Move LLM calls from client-side Forge API to server-side /api/llm proxy using BUILT_IN_FORGE_API_KEY
- [x] Update all frontend agent execution to call server proxy instead of direct API
- [x] Test every Execute button on every page and verify 100% success
