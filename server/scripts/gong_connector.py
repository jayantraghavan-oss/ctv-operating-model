#!/usr/bin/env python3
"""
Gong Connector Bridge — Called by Node.js server via subprocess.
Pulls recent call data, extracts themes and objection patterns.
Outputs JSON to stdout.
"""
import sys
import json
import argparse
from datetime import datetime, timedelta

sys.path.insert(0, "/home/ubuntu/skills/gong-api/scripts")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--account", type=str, default=None)
    args = parser.parse_args()

    try:
        from gong_helper import GongClient
        client = GongClient()

        from_date = (datetime.now() - timedelta(days=args.days)).strftime("%Y-%m-%d")
        
        # Pull calls
        calls_data = client.list_calls(
            from_date=from_date,
            account_name=args.account if args.account else None
        )
        
        calls = []
        themes = []
        objections = []
        
        if isinstance(calls_data, list):
            raw_calls = calls_data
        elif isinstance(calls_data, dict):
            raw_calls = calls_data.get("calls", calls_data.get("records", []))
        else:
            raw_calls = []

        for c in raw_calls[:50]:  # Cap at 50 for context size
            call_entry = {
                "title": c.get("title", c.get("name", "Untitled")),
                "date": c.get("started", c.get("date", "")),
                "account": c.get("accountName", c.get("account", "Unknown")),
                "duration": round(c.get("duration", c.get("durationMinutes", 0)), 1),
            }
            calls.append(call_entry)

        # Build summary
        summary_parts = []
        summary_parts.append(f"{len(raw_calls)} calls in last {args.days} days")
        if args.account:
            summary_parts.append(f"for account: {args.account}")
        
        # Extract themes from call titles
        title_words = {}
        for c in raw_calls:
            title = c.get("title", "")
            for word in title.lower().split():
                if len(word) > 4 and word not in {"about", "their", "would", "could", "should", "these", "those", "where", "which"}:
                    title_words[word] = title_words.get(word, 0) + 1
        themes = [w for w, count in sorted(title_words.items(), key=lambda x: -x[1])[:10]]

        result = {
            "calls": calls[:20],
            "themes": themes,
            "objections": objections,
            "volume": {"total": len(raw_calls), "period": f"{args.days}d"},
            "summary": ". ".join(summary_parts),
        }

        print(json.dumps(result))

    except ImportError:
        print(json.dumps({"error": "gong_helper not available", "calls": [], "themes": [], "objections": [], "volume": {"total": 0, "period": f"{args.days}d"}, "summary": "Gong API not configured"}))
    except Exception as e:
        print(json.dumps({"error": str(e), "calls": [], "themes": [], "objections": [], "volume": {"total": 0, "period": f"{args.days}d"}, "summary": f"Gong error: {str(e)[:100]}"}))

if __name__ == "__main__":
    main()
