#!/usr/bin/env python3
"""Gong health check — verifies API credentials and connectivity."""
import sys, json
sys.path.insert(0, "/home/ubuntu/skills/gong-api/scripts")
try:
    from gong_helper import GongClient
    client = GongClient()
    users = client.list_users()
    print(json.dumps({"ok": True, "users": len(users) if isinstance(users, list) else 0}))
except Exception as e:
    print(json.dumps({"ok": False, "error": str(e)[:200]}))
