#!/usr/bin/env python3
"""Sensor Tower health check — verifies API token."""
import sys, json
sys.path.insert(0, "/home/ubuntu/skills/sensor-tower-api/scripts")
try:
    from sensor_tower_api import SensorTower
    st = SensorTower()
    health = st.token_health_check()
    ok = health.get("status") == "ok" if isinstance(health, dict) else False
    print(json.dumps({"ok": ok, "detail": health}))
except Exception as e:
    print(json.dumps({"ok": False, "error": str(e)[:200]}))
