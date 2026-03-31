#!/usr/bin/env python3
"""
slack_ctv_live.py — Pull live CTV campaign metrics from Slack channels via MCP.

Sources (with channel IDs):
  1. #sdk-biz-alerts (C0APGT7E5AQ) — Dan McDonald's automated spend swing alerts
  2. #ctv-all (C097KPXC5S7) — Main CTV channel with GAS/ARR updates
  3. #ctv-commercial (C0AP28L7KT8) — CTV commercial discussions
  4. #ctv-sales-amer (C09JC0E66VB) — AMER CTV sales
  5. #ctv-sales-apac (C09HLDE85SN) — APAC CTV sales
  6. #ctv-vip-winnerstudio (C0AKZ6T6XPT) — Tang Luck VIP channel
  7. #ctv-chn-activation (C0AKPTVBB28) — CTV activation fund

BQ Query Pattern (Dan McDonald):
  Tables: fact_dsp_core, cs_v5_items_view.campaign
  CTV Filter: JSON_VALUE(original_json, "$.type") LIKE '%CTV%'
  Top Platforms: KRAKEN, PMG, ARBGAMINGLLC, REELSHORT (70%+ CTV GAS)

Output: JSON with live metrics, spend alerts, campaign updates, and channel signals.
"""

import json
import subprocess
import sys
import re
from datetime import datetime

CHANNELS = {
    "sdk-biz-alerts": "C0APGT7E5AQ",
    "ctv-all": "C097KPXC5S7",
    "ctv-commercial": "C0AP28L7KT8",
    "ctv-sales-amer": "C09JC0E66VB",
    "ctv-sales-apac": "C09HLDE85SN",
    "ctv-vip-winnerstudio": "C0AKZ6T6XPT",
    "ctv-chn-activation": "C0AKPTVBB28",
}

def call_slack_mcp(tool_name: str, args: dict, timeout: int = 15) -> dict:
    """Call a Slack MCP tool via manus-mcp-cli with correct -i flag."""
    try:
        result = subprocess.run(
            ["manus-mcp-cli", "tool", "call", tool_name, "-s", "slack", "-i", json.dumps(args)],
            capture_output=True, text=True, timeout=timeout
        )
        if result.returncode == 0 and result.stdout.strip():
            # Parse the JSON from the tool result
            try:
                return json.loads(result.stdout.strip())
            except json.JSONDecodeError:
                # The output might be wrapped in a result object
                return {"raw": result.stdout.strip()[:2000]}
        return {"error": f"returncode={result.returncode}", "stderr": result.stderr[:200] if result.stderr else ""}
    except subprocess.TimeoutExpired:
        return {"error": "timeout"}
    except Exception as e:
        return {"error": str(e)[:200]}

def read_channel(channel_id: str, limit: int = 15) -> str:
    """Read recent messages from a Slack channel by ID. Returns raw text."""
    result = call_slack_mcp("slack_read_channel", {
        "channel_id": channel_id,
        "limit": limit,
        "response_format": "concise"
    })
    return result.get("messages", result.get("raw", ""))

def search_slack(query: str, limit: int = 10) -> str:
    """Search Slack for messages. Returns raw text."""
    result = call_slack_mcp("slack_search_public", {
        "query": query,
        "limit": limit
    })
    return result.get("results", result.get("raw", ""))

def parse_gas_arr(text: str) -> dict:
    """Extract GAS and ARR numbers from text."""
    gas_match = re.search(r'GAS\s+(?:of\s+)?[\$]?([\d,.]+)\s*([KkMm])?', text)
    arr_match = re.search(r'ARR\s+[\$]?([\d,.]+)\s*([KkMm])?', text)
    
    gas = 0
    arr = 0
    if gas_match:
        val = float(gas_match.group(1).replace(",", ""))
        suffix = (gas_match.group(2) or "").upper()
        gas = val * (1_000_000 if suffix == "M" else 1_000 if suffix == "K" else 1)
    if arr_match:
        val = float(arr_match.group(1).replace(",", ""))
        suffix = (arr_match.group(2) or "").upper()
        arr = val * (1_000_000 if suffix == "M" else 1_000 if suffix == "K" else 1)
    
    return {"weekly_gas": gas, "arr": arr}

def parse_drr(text: str) -> list:
    """Extract DRR (Daily Run Rate) mentions from text."""
    drr_entries = []
    # Pattern: $XK DRR or DRR: $XK or DRR $XK
    drr_pattern = r'(?:DRR[:\s]+[\$]?([\d,.]+)\s*([KkMm])?|[\$]?([\d,.]+)\s*([KkMm])?\s*/?\s*DRR)'
    for match in re.finditer(drr_pattern, text):
        val_str = match.group(1) or match.group(3)
        suffix = (match.group(2) or match.group(4) or "").upper()
        if val_str:
            val = float(val_str.replace(",", ""))
            multiplier = 1_000_000 if suffix == "M" else 1_000 if suffix == "K" else 1
            drr_entries.append(val * multiplier)
    return drr_entries

def parse_spend_alerts(text: str) -> list:
    """Parse Dan's SDK Spend Drop Alert format from #sdk-biz-alerts."""
    alerts = []
    # Pattern: ADVERTISER / App Name / Format: $X → $Y (pct%, $delta)
    alert_pattern = r':small_red_triangle_down:\s*([A-Z_\s]+?)\s*/\s*(.+?)\s*/\s*(\w+):\s*\$([\d,.]+[KkMm]?)\s*(?:→|->)\s*\$([\d,.]+[KkMm]?)\s*\(([+-]?\d+)%,\s*[+-]?\$([\d,.]+[KkMm]?)\)'
    
    for match in re.finditer(alert_pattern, text):
        advertiser = match.group(1).strip()
        app_name = match.group(2).strip()
        ad_format = match.group(3).strip()
        spend_before = match.group(4)
        spend_after = match.group(5)
        pct_change = int(match.group(6))
        delta = match.group(7)
        
        alerts.append({
            "advertiser": advertiser,
            "app_name": app_name,
            "ad_format": ad_format,
            "spend_before": spend_before,
            "spend_after": spend_after,
            "pct_change": pct_change,
            "delta": delta,
        })
    
    # Also parse SOV data
    sov_pattern = r'SOV:\s*([\d.]+)%\s*(?:→|->)\s*([\d.]+)%\s*\(([+-]\d+)%\)'
    sov_entries = []
    for match in re.finditer(sov_pattern, text):
        sov_entries.append({
            "before": float(match.group(1)),
            "after": float(match.group(2)),
            "change_pct": int(match.group(3)),
        })
    
    # Attach SOV to alerts if counts match
    for i, alert in enumerate(alerts):
        if i < len(sov_entries):
            alert["sov"] = sov_entries[i]
    
    return alerts

def parse_campaign_updates(text: str) -> list:
    """Extract campaign performance updates from channel messages."""
    updates = []
    
    # Look for spend/DRR/ROAS/GAS patterns with context
    lines = text.split("\n")
    for i, line in enumerate(lines):
        has_metric = bool(re.search(r'\$[\d,.]+[KkMm]?|\bDRR\b|\bROAS\b|\bGAS\b|\bCPA\b|\bCPI\b', line, re.IGNORECASE))
        has_ctv = bool(re.search(r'\bCTV\b', line, re.IGNORECASE))
        
        if has_metric and (has_ctv or any(re.search(r'\bCTV\b', lines[max(0,i-2):i+3][j] if j < len(lines[max(0,i-2):i+3]) else "", re.IGNORECASE) for j in range(5))):
            # Extract dollar amounts
            dollars = re.findall(r'\$([\d,.]+[KkMm]?)', line)
            # Extract advertiser context
            context_lines = lines[max(0,i-2):i+3]
            
            updates.append({
                "text": line.strip()[:300],
                "amounts": dollars[:5],
                "context": " ".join(l.strip() for l in context_lines)[:500],
            })
    
    return updates[:20]  # Cap at 20

def main():
    """Pull live CTV data from all Slack channels and output structured JSON."""
    output = {
        "gas_arr": {"weekly_gas": 0, "arr": 0, "source": "", "date": ""},
        "spend_alerts": [],
        "campaign_updates": [],
        "drr_signals": [],
        "channel_signals": [],
        "bq_query_pattern": {
            "tables": ["moloco-ae-view.athena.fact_dsp_core", "moloco-dsp-data-source.standard_cs_v5_items_view.campaign"],
            "ctv_filter": "JSON_VALUE(original_json, '$.type') LIKE '%CTV%'",
            "top_platforms": ["KRAKEN", "PMG", "ARBGAMINGLLC", "REELSHORT"],
        },
        "metadata": {
            "fetched_at": datetime.utcnow().isoformat(),
            "channels_queried": [],
            "errors": [],
        }
    }

    # 1. Pull from #ctv-all for GAS/ARR headline
    try:
        ctv_all_text = read_channel(CHANNELS["ctv-all"], 15)
        output["metadata"]["channels_queried"].append("#ctv-all")
        
        gas_data = parse_gas_arr(ctv_all_text if isinstance(ctv_all_text, str) else "")
        if gas_data["weekly_gas"] > 0:
            output["gas_arr"] = {**gas_data, "source": "#ctv-all", "date": datetime.utcnow().strftime("%Y-%m-%d")}
        
        updates = parse_campaign_updates(ctv_all_text if isinstance(ctv_all_text, str) else "")
        output["campaign_updates"].extend(updates)
    except Exception as e:
        output["metadata"]["errors"].append(f"ctv-all: {str(e)[:100]}")

    # 2. Pull Dan's spend alerts from #sdk-biz-alerts
    try:
        sdk_text = read_channel(CHANNELS["sdk-biz-alerts"], 10)
        output["metadata"]["channels_queried"].append("#sdk-biz-alerts")
        
        alerts = parse_spend_alerts(sdk_text if isinstance(sdk_text, str) else "")
        output["spend_alerts"] = alerts
    except Exception as e:
        output["metadata"]["errors"].append(f"sdk-biz-alerts: {str(e)[:100]}")

    # 3. Pull from CTV sales channels
    for channel_name in ["ctv-sales-amer", "ctv-sales-apac", "ctv-commercial"]:
        try:
            channel_id = CHANNELS.get(channel_name)
            if not channel_id:
                continue
            text = read_channel(channel_id, 10)
            output["metadata"]["channels_queried"].append(f"#{channel_name}")
            
            updates = parse_campaign_updates(text if isinstance(text, str) else "")
            output["campaign_updates"].extend(updates)
            
            drrs = parse_drr(text if isinstance(text, str) else "")
            for drr in drrs:
                output["drr_signals"].append({"channel": f"#{channel_name}", "drr": drr})
        except Exception as e:
            output["metadata"]["errors"].append(f"{channel_name}: {str(e)[:100]}")

    # 4. Pull from VIP and activation channels
    for channel_name in ["ctv-vip-winnerstudio", "ctv-chn-activation"]:
        try:
            channel_id = CHANNELS.get(channel_name)
            if not channel_id:
                continue
            text = read_channel(channel_id, 10)
            output["metadata"]["channels_queried"].append(f"#{channel_name}")
            
            updates = parse_campaign_updates(text if isinstance(text, str) else "")
            output["campaign_updates"].extend(updates)
        except Exception as e:
            output["metadata"]["errors"].append(f"{channel_name}: {str(e)[:100]}")

    # 5. Search for recent CTV spend/DRR data
    try:
        search_text = search_slack("CTV GAS DRR spend weekly", 5)
        if isinstance(search_text, str):
            gas_search = parse_gas_arr(search_text)
            if gas_search["weekly_gas"] > output["gas_arr"]["weekly_gas"]:
                output["gas_arr"] = {**gas_search, "source": "search", "date": datetime.utcnow().strftime("%Y-%m-%d")}
            
            drrs = parse_drr(search_text)
            for drr in drrs:
                output["drr_signals"].append({"channel": "#search", "drr": drr})
    except Exception as e:
        output["metadata"]["errors"].append(f"search: {str(e)[:100]}")

    # 6. Build channel signal summary
    for channel_name, channel_id in CHANNELS.items():
        relevant_updates = [u for u in output["campaign_updates"] if channel_name in str(u.get("context", ""))]
        output["channel_signals"].append({
            "channel": f"#{channel_name}",
            "channel_id": channel_id,
            "updates_found": len(relevant_updates),
            "has_spend_data": any(u.get("amounts") for u in relevant_updates),
        })

    # Deduplicate campaign updates
    seen = set()
    deduped = []
    for u in output["campaign_updates"]:
        key = u["text"][:100]
        if key not in seen:
            seen.add(key)
            deduped.append(u)
    output["campaign_updates"] = deduped[:30]

    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()
