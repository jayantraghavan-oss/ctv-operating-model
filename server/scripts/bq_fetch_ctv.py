#!/usr/bin/env python3
"""
BQ CTV Revenue Data Fetcher
Pulls real CTV revenue data from BigQuery and outputs JSON to stdout.
Called by the Node.js server via child_process.

Usage:
  python3 bq_fetch_ctv.py [query_type]

Query types:
  summary       - Overall KPIs (total GAS, campaigns, daily avg, trailing 7d)
  monthly       - Monthly breakdown (GAS, avg daily, campaigns, advertisers)
  daily_recent  - Daily data for last 30 days
  top_advertisers - Top advertisers by spend
  exchanges     - Exchange breakdown (last 7 days)
  concentration - Revenue concentration (top advertisers share)
  all           - All of the above in one call
"""

import json
import sys
from datetime import datetime

try:
    from google.cloud import bigquery
    client = bigquery.Client(project='moloco-ae-view')
except Exception as e:
    print(json.dumps({"error": f"BQ connection failed: {str(e)}", "fallback": True}))
    sys.exit(0)


def run_query(sql):
    """Execute a BQ query and return results as list of dicts."""
    try:
        rows = list(client.query(sql).result())
        result = []
        for row in rows:
            d = {}
            for key in row.keys():
                val = row[key]
                if hasattr(val, 'isoformat'):
                    d[key] = val.isoformat()
                elif val is None:
                    d[key] = None
                else:
                    d[key] = float(val) if isinstance(val, (int, float)) else str(val)
            result.append(d)
        return result
    except Exception as e:
        return {"error": str(e)}


def get_summary():
    """Overall CTV KPIs."""
    return run_query("""
        SELECT 
          SUM(gross_spend_usd) as total_gas,
          SUM(gross_spend_usd) / COUNT(DISTINCT date_utc) as avg_daily_gas,
          COUNT(DISTINCT campaign.title_id) as total_campaigns,
          COUNT(DISTINCT campaign.tracking_entity) as total_advertisers,
          MIN(date_utc) as min_date,
          MAX(date_utc) as max_date,
          COUNT(DISTINCT date_utc) as total_days
        FROM `moloco-ae-view.athena.fact_dsp_core`
        WHERE campaign.os = 'CTV'
          AND moloco_product = 'DSP'
          AND date_utc >= '2025-10-01'
    """)


def get_trailing_7d():
    """Trailing 7-day daily average."""
    return run_query("""
        SELECT 
          SUM(gross_spend_usd) / COUNT(DISTINCT date_utc) as trailing_7d_daily,
          SUM(gross_spend_usd) as trailing_7d_total,
          COUNT(DISTINCT campaign.title_id) as active_campaigns_7d,
          COUNT(DISTINCT campaign.tracking_entity) as active_advertisers_7d,
          MIN(date_utc) as period_start,
          MAX(date_utc) as period_end
        FROM `moloco-ae-view.athena.fact_dsp_core`
        WHERE campaign.os = 'CTV'
          AND moloco_product = 'DSP'
          AND date_utc >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    """)


def get_monthly():
    """Monthly breakdown."""
    return run_query("""
        SELECT 
          FORMAT_DATE('%Y-%m', date_utc) as month,
          SUM(gross_spend_usd) as monthly_gas,
          SUM(gross_spend_usd) / COUNT(DISTINCT date_utc) as avg_daily_gas,
          COUNT(DISTINCT campaign.title_id) as active_campaigns,
          COUNT(DISTINCT campaign.tracking_entity) as active_advertisers,
          COUNT(DISTINCT date_utc) as days_in_month
        FROM `moloco-ae-view.athena.fact_dsp_core`
        WHERE campaign.os = 'CTV'
          AND moloco_product = 'DSP'
          AND date_utc >= '2025-10-01'
        GROUP BY 1
        ORDER BY 1
    """)


def get_daily_recent():
    """Daily data for last 30 days."""
    return run_query("""
        SELECT 
          date_utc,
          SUM(gross_spend_usd) as daily_gas,
          COUNT(DISTINCT campaign.title_id) as active_campaigns
        FROM `moloco-ae-view.athena.fact_dsp_core`
        WHERE campaign.os = 'CTV'
          AND moloco_product = 'DSP'
          AND date_utc >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY 1
        ORDER BY 1
    """)


def get_top_advertisers():
    """Top 15 advertisers by total spend since Oct 1."""
    return run_query("""
        SELECT 
          campaign.tracking_entity as advertiser,
          SUM(gross_spend_usd) as total_gas,
          COUNT(DISTINCT campaign.title_id) as campaigns,
          MIN(date_utc) as first_active,
          MAX(date_utc) as last_active
        FROM `moloco-ae-view.athena.fact_dsp_core`
        WHERE campaign.os = 'CTV'
          AND moloco_product = 'DSP'
          AND date_utc >= '2025-10-01'
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 15
    """)


def get_exchanges():
    """Exchange breakdown (last 7 days)."""
    return run_query("""
        SELECT 
          exchange,
          SUM(gross_spend_usd) as total_gas,
          COUNT(DISTINCT campaign.title_id) as campaigns
        FROM `moloco-ae-view.athena.fact_dsp_core`
        WHERE campaign.os = 'CTV'
          AND moloco_product = 'DSP'
          AND date_utc >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10
    """)


def get_concentration():
    """Revenue concentration — top advertisers' share of last 30d spend."""
    return run_query("""
        WITH ranked AS (
          SELECT 
            campaign.tracking_entity as advertiser,
            SUM(gross_spend_usd) as gas
          FROM `moloco-ae-view.athena.fact_dsp_core`
          WHERE campaign.os = 'CTV'
            AND moloco_product = 'DSP'
            AND date_utc >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
          GROUP BY 1
          ORDER BY 2 DESC
        )
        SELECT 
          advertiser,
          gas,
          gas / SUM(gas) OVER() * 100 as pct_of_total,
          SUM(gas) OVER(ORDER BY gas DESC) / SUM(gas) OVER() * 100 as cumulative_pct
        FROM ranked
        LIMIT 10
    """)


def get_all():
    """Fetch all data in one call."""
    return {
        "summary": get_summary(),
        "trailing_7d": get_trailing_7d(),
        "monthly": get_monthly(),
        "daily_recent": get_daily_recent(),
        "top_advertisers": get_top_advertisers(),
        "exchanges": get_exchanges(),
        "concentration": get_concentration(),
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "source": "BigQuery:moloco-ae-view.athena.fact_dsp_core",
        "fallback": False,
    }


if __name__ == "__main__":
    query_type = sys.argv[1] if len(sys.argv) > 1 else "all"
    
    dispatch = {
        "summary": get_summary,
        "trailing_7d": get_trailing_7d,
        "monthly": get_monthly,
        "daily_recent": get_daily_recent,
        "top_advertisers": get_top_advertisers,
        "exchanges": get_exchanges,
        "concentration": get_concentration,
        "all": get_all,
    }
    
    fn = dispatch.get(query_type, get_all)
    result = fn()
    print(json.dumps(result, indent=2))
