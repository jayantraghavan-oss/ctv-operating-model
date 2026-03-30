#!/usr/bin/env python3
"""
Sensor Tower Connector Bridge — Called by Node.js server via subprocess.
Pulls app intelligence, market trends, SDK data.
Outputs JSON to stdout.
"""
import sys
import json
import argparse
from datetime import datetime, timedelta

sys.path.insert(0, "/home/ubuntu/skills/sensor-tower-api/scripts")

# Key CTV/streaming competitor app IDs
CTV_APPS = {
    "tubi": {"ios": "446613023", "android": "com.tubitv"},
    "pluto_tv": {"ios": "751712884", "android": "tv.pluto.android"},
    "roku": {"ios": "482066631", "android": "com.roku.remote"},
    "peacock": {"ios": "1508186374", "android": "com.peacocktv.peacockandroid"},
    "paramount_plus": {"ios": "685702757", "android": "com.cbs.app"},
    "freevee": {"ios": "545519333", "android": "com.amazon.avod.thirdpartyclient"},
    "samsung_tv_plus": {"android": "com.samsung.android.tvplus"},
    "tiktok": {"ios": "835599320", "android": "com.zhiliaoapp.musically"},
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apps", type=str, default=None, help="Comma-separated app IDs")
    parser.add_argument("--category", type=str, default=None)
    args = parser.parse_args()

    try:
        from sensor_tower_api import SensorTower
        st = SensorTower()

        result = {"competitor_apps": [], "market_trends": [], "sdk_intel": [], "summary": ""}

        end_date = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=32)).strftime("%Y-%m-%d")

        # Pull competitor app data
        target_apps = []
        if args.apps:
            target_apps = args.apps.split(",")
        else:
            # Default: pull top CTV/streaming apps
            for app_name, ids in list(CTV_APPS.items())[:5]:
                if "ios" in ids:
                    target_apps.append(ids["ios"])

        for app_id in target_apps[:8]:
            try:
                history = st.app_history(
                    app_id=app_id,
                    market="ios",
                    countries="US",
                    feeds="downloads,revenue",
                    start_date=start_date,
                    end_date=end_date,
                )
                
                downloads = 0
                revenue = 0
                if isinstance(history, dict):
                    for feed_data in history.values():
                        if isinstance(feed_data, list):
                            for entry in feed_data:
                                downloads += entry.get("downloads", 0)
                                revenue += entry.get("revenue", 0)
                elif isinstance(history, list):
                    for entry in history:
                        downloads += entry.get("downloads", 0)
                        revenue += entry.get("revenue", 0)

                # Search for app name
                search_results = st.search(app_id)
                app_name = app_id
                rating = 0
                if isinstance(search_results, list) and len(search_results) > 0:
                    app_name = search_results[0].get("name", app_id)
                    rating = search_results[0].get("rating", 0)
                elif isinstance(search_results, dict):
                    results_list = search_results.get("results", [])
                    if results_list:
                        app_name = results_list[0].get("name", app_id)
                        rating = results_list[0].get("rating", 0)

                result["competitor_apps"].append({
                    "name": app_name,
                    "downloads": downloads,
                    "revenue": revenue,
                    "rating": round(rating, 1) if rating else 0,
                })
            except Exception as e:
                continue

        # Market trends (top charts)
        try:
            category = args.category or "Entertainment"
            charts = st.store_ranking(
                market="ios",
                countries="US",
                categories=category,
                chart_type="free",
            )
            top_apps = []
            if isinstance(charts, list):
                top_apps = [c.get("name", c.get("app_name", "Unknown")) for c in charts[:10]]
            elif isinstance(charts, dict):
                chart_list = charts.get("rankings", charts.get("results", []))
                top_apps = [c.get("name", c.get("app_name", "Unknown")) for c in chart_list[:10]]

            result["market_trends"].append({
                "category": category,
                "growth": "trending",
                "topApps": top_apps[:5],
            })
        except Exception:
            pass

        # SDK intelligence for key apps
        for app_name, ids in list(CTV_APPS.items())[:3]:
            try:
                app_id = ids.get("ios", ids.get("android", ""))
                if not app_id:
                    continue
                sdk_data = st.sdk_intelligence(app_id)
                sdks = []
                if isinstance(sdk_data, list):
                    sdks = [s.get("name", s.get("sdk_name", "Unknown")) for s in sdk_data[:10]]
                elif isinstance(sdk_data, dict):
                    sdk_list = sdk_data.get("sdks", sdk_data.get("installed_sdks", []))
                    sdks = [s.get("name", s.get("sdk_name", "Unknown")) for s in sdk_list[:10]]
                
                result["sdk_intel"].append({
                    "appName": app_name.replace("_", " ").title(),
                    "sdks": sdks,
                })
            except Exception:
                continue

        result["summary"] = f"{len(result['competitor_apps'])} competitor apps tracked. {len(result['market_trends'])} market categories. {len(result['sdk_intel'])} apps with SDK data."

        print(json.dumps(result))

    except ImportError:
        print(json.dumps({"error": "sensor_tower_api not available", "competitor_apps": [], "market_trends": [], "sdk_intel": [], "summary": "Sensor Tower not configured"}))
    except Exception as e:
        print(json.dumps({"error": str(e), "competitor_apps": [], "market_trends": [], "sdk_intel": [], "summary": f"Sensor Tower error: {str(e)[:100]}"}))

if __name__ == "__main__":
    main()
