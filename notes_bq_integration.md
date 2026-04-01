# BQ Integration Status

## CC CTV Reporting Page - Observations (Mar 31, 2026)

### Current State
- Page renders correctly with all 4 tabs (Q1-Q4)
- BQ data shows "est · 7d trailing" not "BQ · 7d trailing" → BQ fetch is falling back to static data
- The "BQ Live" indicator is NOT showing → `trpcQuery("reporting.bqRevenue")` is either failing or returning `available: false`
- Static fallback data is displaying correctly: $195K, 39 campaigns, 22.7% win rate, $8.2M pipeline, 5 exchanges
- Charts render: revenue trend, campaign ramp, pipeline funnel, concentration donut
- Risk signals showing correctly

### Next Steps
- Check browser console for BQ fetch errors
- Verify the bqBridge.ts Python script path resolution works in dev mode
- Test the tRPC endpoint directly
