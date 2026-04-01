# Gong API Call Structure

## Call Fields (from real API response)
- `id`: "4866751321530661931" — unique call ID
- `url`: "https://us-42809.app.gong.io/call?id=4866751321530661931" — **deep link to Gong call**
- `title`: "Minimalist <> Moloco" — call title
- `scheduled`: ISO datetime
- `started`: ISO datetime  
- `duration`: 551 (seconds)
- `primaryUserId`: user ID
- `direction`: "Conference"
- `system`: "Google Meet"
- `scope`: "External"
- `media`: "Video"
- `language`: "eng"
- `meetingUrl`: Google Meet link
- `isPrivate`: boolean

## Key Insight
- The `url` field gives us the direct Gong deep link: `https://us-42809.app.gong.io/call?id={call_id}`
- No `accountName` field directly on call — need to check if it's in extended call data or participants
- `list_calls` returns paginated results, need to handle cursor

## Available Methods
- `client.list_calls(from_date, to_date, account_name, limit)` — list calls
- `client.get_call(call_id)` — full call details
- `client.get_transcript(call_id)` — transcript sentences
- `client.get_transcript_text(call_id)` — plain text transcript
- `client.get_calls_with_transcripts(...)` — calls + transcripts combined
- `client.search_calls(keyword, ...)` — search by title/account
- `client.list_users()` — all Gong users
- `client.get_user_stats(from_date, to_date)` — interaction stats
