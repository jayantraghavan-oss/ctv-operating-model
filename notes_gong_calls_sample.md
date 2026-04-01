# Gong API Call Data — Key Findings

## Deep Link Format
`https://us-42809.app.gong.io/call?id={call_id}`

## Call Fields
- `id`: unique call ID (string of digits)
- `url`: full deep link to Gong call
- `title`: e.g. "Moloco <> Tilting Point"
- `scheduled`, `started`: ISO datetime
- `duration`: seconds
- `primaryUserId`: Gong user ID
- `direction`: "Conference"
- `system`: "Zoom", "Google Meet"
- `scope`: "External", "Internal"
- `media`: "Video"
- `language`: "eng"
- `meetingUrl`: original meeting URL

## Account Name Extraction
- No `accountName` field directly on call object
- Account name typically embedded in title: "Moloco <> {Account}" or "{Account} / Moloco"
- Can parse from title using regex patterns like: `<>`, `//`, `/`, `x`, `|`

## CTV Call Identification
- No "CTV" keyword in titles — CTV is discussed within broader account calls
- Need to pull transcripts and search for CTV/streaming/OTT mentions
- Or use the known CTV advertiser list from BQ data to match call titles

## Sample Calls (Jan-Mar 2026)
100+ calls returned for Q1 2026. Mix of:
- Account syncs: "Moloco <> Tilting Point", "FanDuel | Moloco"
- Campaign reviews: "[Mobgame x Moloco] Campaign Review"
- Internal: "Adam <> Sid"
- Korean: "넷마블-몰로코 Biweekly"
