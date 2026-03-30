#!/usr/bin/env python3
"""Salesforce health check — verifies API token and connectivity."""
import sys, json
sys.path.insert(0, "/home/ubuntu/skills/salesforce-connector/scripts")
try:
    from sf_connector import get_sf
    sf = get_sf()
    result = sf.query("SELECT COUNT(Id) cnt FROM Account LIMIT 1")
    records = result if isinstance(result, list) else result.get("records", [])
    print(json.dumps({"ok": True, "accounts": records[0].get("cnt", 0) if records else 0}))
except Exception as e:
    print(json.dumps({"ok": False, "error": str(e)[:200]}))
