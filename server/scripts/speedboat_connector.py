#!/usr/bin/env python3
"""
Speedboat MCP Connector Bridge — Called by Node.js server via subprocess.
Calls Speedboat MCP tools via manus-mcp-cli.
Outputs JSON to stdout.
"""
import sys
import json
import argparse
import subprocess

MCP_URL = "https://speedboat-mcp-891923006843.us-central1.run.app/mcp"

def call_mcp_tool(tool_name: str, params: dict, timeout: int = 30) -> dict:
    """Call a Speedboat MCP tool via manus-mcp-cli."""
    try:
        cmd = ["manus-mcp-cli", "call", MCP_URL, tool_name, json.dumps(params)]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if result.returncode == 0 and result.stdout.strip():
            return json.loads(result.stdout.strip())
        return {"error": result.stderr[:200] if result.stderr else "No output"}
    except subprocess.TimeoutExpired:
        return {"error": "MCP call timed out"}
    except json.JSONDecodeError:
        return {"error": "Invalid JSON response from MCP"}
    except FileNotFoundError:
        return {"error": "manus-mcp-cli not found"}
    except Exception as e:
        return {"error": str(e)[:200]}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--advertiser", type=str, default=None)
    args = parser.parse_args()

    result = {"performance": [], "campaigns": [], "geo": [], "trends": [], "summary": ""}

    try:
        if args.advertiser:
            # Step 1: Resolve entity
            entity = call_mcp_tool("resolve_moloco_entity", {"name": args.advertiser})
            entity_id = None
            if isinstance(entity, dict) and not entity.get("error"):
                entity_id = entity.get("entity_id", entity.get("id"))
            
            if entity_id:
                # Step 2: Pull performance data
                perf = call_mcp_tool("data_retrieval_for_gtm", {
                    "entity_id": entity_id,
                    "days": 30,
                })
                if isinstance(perf, dict) and not perf.get("error"):
                    result["performance"].append({
                        "name": args.advertiser,
                        "spend": perf.get("spend", 0),
                        "installs": perf.get("installs", 0),
                        "cpi": perf.get("cpi", 0),
                        "roas": perf.get("roas", 0),
                    })

                # Step 3: Campaign breakdown
                campaigns = call_mcp_tool("get_campaign_details", {"entity_id": entity_id})
                if isinstance(campaigns, dict) and not campaigns.get("error"):
                    camp_list = campaigns.get("campaigns", [])
                    for c in camp_list[:10]:
                        result["campaigns"].append({
                            "name": c.get("name", "Unknown"),
                            "status": c.get("status", "Unknown"),
                            "budget": c.get("budget", 0),
                            "spend": c.get("spend", 0),
                        })

                # Step 4: Geo breakdown
                geo = call_mcp_tool("get_geo_breakdown", {"entity_id": entity_id, "days": 30})
                if isinstance(geo, dict) and not geo.get("error"):
                    geo_list = geo.get("countries", geo.get("geo", []))
                    for g in geo_list[:10]:
                        result["geo"].append({
                            "country": g.get("country", "Unknown"),
                            "spend": g.get("spend", 0),
                            "installs": g.get("installs", 0),
                        })

                # Step 5: Trends
                trends = call_mcp_tool("get_performance_trends", {
                    "entity_id": entity_id,
                    "days": 30,
                    "granularity": "daily",
                })
                if isinstance(trends, dict) and not trends.get("error"):
                    trend_list = trends.get("data", trends.get("trends", []))
                    for t in trend_list[:30]:
                        result["trends"].append({
                            "date": t.get("date", ""),
                            "spend": t.get("spend", 0),
                            "installs": t.get("installs", 0),
                            "cpi": t.get("cpi", 0),
                        })

                result["summary"] = f"Speedboat data for {args.advertiser}: ${result['performance'][0]['spend'] if result['performance'] else 0:,.0f} spend, {len(result['campaigns'])} campaigns, {len(result['geo'])} geos."
            else:
                result["summary"] = f"Could not resolve entity: {args.advertiser}"
        else:
            result["summary"] = "No advertiser specified for Speedboat query"

        print(json.dumps(result))

    except Exception as e:
        result["summary"] = f"Speedboat error: {str(e)[:100]}"
        print(json.dumps(result))

if __name__ == "__main__":
    main()
