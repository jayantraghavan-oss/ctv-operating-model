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

# Key CTV/streaming competitor app IDs with known display names
CTV_APPS = {
    "Tubi": {"ios": "446613023", "android": "com.tubitv"},
    "Pluto TV": {"ios": "751712884", "android": "tv.pluto.android"},
    "Roku": {"ios": "482066631", "android": "com.roku.remote"},
    "Peacock": {"ios": "1508186374", "android": "com.peacocktv.peacockandroid"},
    "Paramount+": {"ios": "685702757", "android": "com.cbs.app"},
    "Freevee": {"ios": "545519333", "android": "com.amazon.avod.thirdpartyclient"},
    "Samsung TV Plus": {"android": "com.samsung.android.tvplus"},
    "TikTok": {"ios": "835599320", "android": "com.zhiliaoapp.musically"},
}

# Reverse lookup: app_id → display name
APP_ID_TO_NAME = {}
for name, ids in CTV_APPS.items():
    for platform_id in ids.values():
        APP_ID_TO_NAME[platform_id] = name


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
            # Default: pull top CTV/streaming apps (iOS IDs)
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

                # Use known name from our dictionary first, fall back to search
                app_name = APP_ID_TO_NAME.get(app_id, None)
                rating = 0

                if not app_name:
                    # Only search if we don't have a known name
                    try:
                        search_results = st.search(app_id)
                        if isinstance(search_results, list) and len(search_results) > 0:
                            app_name = search_results[0].get("name", app_id)
                            rating = search_results[0].get("rating", 0)
                        elif isinstance(search_results, dict):
                            results_list = search_results.get("results", [])
                            if results_list:
                                app_name = results_list[0].get("name", app_id)
                                rating = results_list[0].get("rating", 0)
                    except Exception:
                        pass

                if not app_name:
                    app_name = app_id  # Last resort

                result["competitor_apps"].append({
                    "name": app_name,
                    "downloads": downloads,
                    "revenue": revenue,
                    "rating": round(rating, 1) if rating else 0,
                })
            except Exception:
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
                    "appName": app_name,
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
