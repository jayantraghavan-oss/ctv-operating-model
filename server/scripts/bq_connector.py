#!/usr/bin/env python3
"""
BigQuery Connector for CTV Operating Model
Pulls real revenue data from Moloco's BigQuery tables using Dan's query patterns.

Tables used:
  - moloco-ae-view.athena.fact_dsp_core (primary DSP performance)
  - moloco-data-prod.gtm.daily_attainment_table (EOQ targets/forecasts)
  - moloco-data-prod.gtm.payment_fraud_account (fraud filtering)
  - moloco-ae-view.market_share.fact_market (market share)

Authentication: Uses Application Default Credentials (ADC) from gcloud auth.
"""

import json
import sys
import os
from datetime import datetime, timedelta

try:
    from google.cloud import bigquery
except ImportError:
    print(json.dumps({"error": "google-cloud-bigquery not installed"}))
    sys.exit(1)


def get_client():
    """Create BQ client with ADC credentials."""
    return bigquery.Client(project="moloco-ae-view")


def run_query(client, query, timeout=60):
    """Execute a BQ query and return results as list of dicts."""
    try:
        job = client.query(query)
        results = job.result(timeout=timeout)
        rows = []
        for row in results:
            r = {}
            for key in row.keys():
                val = row[key]
                # Convert date objects to strings
                if hasattr(val, 'isoformat'):
                    val = val.isoformat()
                # Convert Decimal to float
                elif hasattr(val, '__float__'):
                    val = float(val)
                r[key] = val
            rows.append(r)
        return rows
    except Exception as e:
        return {"error": str(e)}


def get_ctv_revenue_summary(client, days=90):
    """
    Pull CTV revenue summary from fact_dsp_core.
    Uses Dan's fraud filtering and DSP product filter.
    CTV is identified by exchange patterns and ad format.
    """
    query = f"""
    WITH fraud_platforms AS (
      SELECT DISTINCT UPPER(platform) AS platform
      FROM `moloco-data-prod.gtm.payment_fraud_account`
    )
    
    SELECT
      DATE_TRUNC(date_utc, MONTH) AS month,
      ROUND(SUM(gross_spend_usd), 2) AS total_spend,
      CAST(SUM(conversions) AS INT64) AS total_conversions,
      ROUND(SUM(gross_spend_usd) / NULLIF(SUM(conversions), 0), 2) AS avg_cpi,
      COUNT(DISTINCT tracking_entity) AS unique_advertisers,
      COUNT(DISTINCT campaign_id) AS unique_campaigns
    FROM `moloco-ae-view.athena.fact_dsp_core` fdc
    LEFT JOIN fraud_platforms
      ON fdc.advertiser.migrated_platform = fraud_platforms.platform
    WHERE date_utc >= DATE_SUB(CURRENT_DATE(), INTERVAL {days} DAY)
      AND moloco_product = "DSP"
      AND fraud_platforms.platform IS NULL
      AND (
        LOWER(exchange) LIKE '%ctv%'
        OR LOWER(exchange) LIKE '%roku%'
        OR LOWER(exchange) LIKE '%tubi%'
        OR LOWER(exchange) LIKE '%samsung%'
        OR LOWER(exchange) LIKE '%vizio%'
        OR LOWER(exchange) LIKE '%lg%'
        OR LOWER(exchange) LIKE '%pluto%'
        OR LOWER(exchange) LIKE '%freevee%'
        OR LOWER(exchange) LIKE '%peacock%'
        OR LOWER(exchange) LIKE '%fubo%'
        OR LOWER(exchange) LIKE '%sling%'
        OR LOWER(exchange) LIKE '%philo%'
        OR LOWER(campaign.name) LIKE '%CTV%'
        OR LOWER(campaign.name) LIKE '%ctv%'
        OR JSON_VALUE(original_json, '$.type') LIKE '%CTV%'
      )
    GROUP BY 1
    ORDER BY 1
    """
    return run_query(client, query)


def get_ctv_by_advertiser(client, days=90):
    """
    Top CTV advertisers by spend with vertical classification.
    Uses Dan's vertical_classifier_2 UDF.
    """
    query = f"""
    WITH fraud_platforms AS (
      SELECT DISTINCT UPPER(platform) AS platform
      FROM `moloco-data-prod.gtm.payment_fraud_account`
    )
    
    SELECT
      tracking_entity,
      advertiser.name AS advertiser_name,
      `moloco-data-prod.gtm.vertical_classifier_2`(
        product.is_gaming,
        advertiser.migrated_platform,
        advertiser_id,
        product.genre,
        product.sub_genre,
        product.iab_category_desc,
        product.app_name,
        product.app_market_bundle,
        campaign.os,
        date_utc
      ) AS vertical,
      ROUND(SUM(gross_spend_usd), 2) AS spend,
      CAST(SUM(conversions) AS INT64) AS installs,
      ROUND(SUM(gross_spend_usd) / NULLIF(SUM(conversions), 0), 2) AS cpi,
      COUNT(DISTINCT campaign_id) AS campaigns,
      MIN(date_utc) AS first_active,
      MAX(date_utc) AS last_active
    FROM `moloco-ae-view.athena.fact_dsp_core` fdc
    LEFT JOIN fraud_platforms
      ON fdc.advertiser.migrated_platform = fraud_platforms.platform
    WHERE date_utc >= DATE_SUB(CURRENT_DATE(), INTERVAL {days} DAY)
      AND moloco_product = "DSP"
      AND fraud_platforms.platform IS NULL
      AND (
        LOWER(exchange) LIKE '%ctv%'
        OR LOWER(exchange) LIKE '%roku%'
        OR LOWER(exchange) LIKE '%tubi%'
        OR LOWER(exchange) LIKE '%samsung%'
        OR LOWER(exchange) LIKE '%vizio%'
        OR LOWER(exchange) LIKE '%lg%'
        OR LOWER(exchange) LIKE '%pluto%'
        OR LOWER(exchange) LIKE '%freevee%'
        OR LOWER(exchange) LIKE '%peacock%'
        OR LOWER(exchange) LIKE '%fubo%'
        OR LOWER(exchange) LIKE '%sling%'
        OR LOWER(exchange) LIKE '%philo%'
        OR LOWER(campaign.name) LIKE '%CTV%'
        OR LOWER(campaign.name) LIKE '%ctv%'
        OR JSON_VALUE(original_json, '$.type') LIKE '%CTV%'
      )
    GROUP BY 1, 2, 3
    ORDER BY spend DESC
    LIMIT 50
    """
    return run_query(client, query)


def get_ctv_weekly_trend(client, weeks=12):
    """Weekly CTV spend trend for charting."""
    query = f"""
    WITH fraud_platforms AS (
      SELECT DISTINCT UPPER(platform) AS platform
      FROM `moloco-data-prod.gtm.payment_fraud_account`
    )
    
    SELECT
      DATE_TRUNC(date_utc, WEEK(MONDAY)) AS week_start,
      ROUND(SUM(gross_spend_usd), 2) AS weekly_spend,
      CAST(SUM(conversions) AS INT64) AS weekly_conversions,
      ROUND(SUM(gross_spend_usd) / NULLIF(SUM(conversions), 0), 2) AS weekly_cpi,
      COUNT(DISTINCT tracking_entity) AS active_advertisers,
      COUNT(DISTINCT campaign_id) AS active_campaigns
    FROM `moloco-ae-view.athena.fact_dsp_core` fdc
    LEFT JOIN fraud_platforms
      ON fdc.advertiser.migrated_platform = fraud_platforms.platform
    WHERE date_utc >= DATE_SUB(CURRENT_DATE(), INTERVAL {weeks * 7} DAY)
      AND moloco_product = "DSP"
      AND fraud_platforms.platform IS NULL
      AND (
        LOWER(exchange) LIKE '%ctv%'
        OR LOWER(exchange) LIKE '%roku%'
        OR LOWER(exchange) LIKE '%tubi%'
        OR LOWER(exchange) LIKE '%samsung%'
        OR LOWER(exchange) LIKE '%vizio%'
        OR LOWER(exchange) LIKE '%lg%'
        OR LOWER(exchange) LIKE '%pluto%'
        OR LOWER(exchange) LIKE '%freevee%'
        OR LOWER(exchange) LIKE '%peacock%'
        OR LOWER(exchange) LIKE '%fubo%'
        OR LOWER(exchange) LIKE '%sling%'
        OR LOWER(exchange) LIKE '%philo%'
        OR LOWER(campaign.name) LIKE '%CTV%'
        OR LOWER(campaign.name) LIKE '%ctv%'
        OR JSON_VALUE(original_json, '$.type') LIKE '%CTV%'
      )
    GROUP BY 1
    ORDER BY 1
    """
    return run_query(client, query)


def get_ctv_by_region(client, days=90):
    """CTV spend broken down by geo/region."""
    query = f"""
    WITH fraud_platforms AS (
      SELECT DISTINCT UPPER(platform) AS platform
      FROM `moloco-data-prod.gtm.payment_fraud_account`
    )
    
    SELECT
      CASE
        WHEN country IN ('US', 'CA', 'MX', 'BR', 'AR', 'CO', 'CL') THEN 'AMER'
        WHEN country IN ('KR', 'JP', 'CN', 'IN', 'AU', 'SG', 'TW', 'TH', 'VN', 'ID', 'PH', 'MY') THEN 'APAC'
        WHEN country IN ('GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'PL', 'TR', 'SA', 'AE', 'IL') THEN 'EMEA'
        ELSE 'Other'
      END AS region,
      ROUND(SUM(gross_spend_usd), 2) AS spend,
      CAST(SUM(conversions) AS INT64) AS conversions,
      COUNT(DISTINCT tracking_entity) AS advertisers
    FROM `moloco-ae-view.athena.fact_dsp_core` fdc
    LEFT JOIN fraud_platforms
      ON fdc.advertiser.migrated_platform = fraud_platforms.platform
    WHERE date_utc >= DATE_SUB(CURRENT_DATE(), INTERVAL {days} DAY)
      AND moloco_product = "DSP"
      AND fraud_platforms.platform IS NULL
      AND (
        LOWER(exchange) LIKE '%ctv%'
        OR LOWER(exchange) LIKE '%roku%'
        OR LOWER(exchange) LIKE '%tubi%'
        OR LOWER(exchange) LIKE '%samsung%'
        OR LOWER(exchange) LIKE '%vizio%'
        OR LOWER(exchange) LIKE '%lg%'
        OR LOWER(exchange) LIKE '%pluto%'
        OR LOWER(exchange) LIKE '%freevee%'
        OR LOWER(exchange) LIKE '%peacock%'
        OR LOWER(exchange) LIKE '%fubo%'
        OR LOWER(exchange) LIKE '%sling%'
        OR LOWER(exchange) LIKE '%philo%'
        OR LOWER(campaign.name) LIKE '%CTV%'
        OR LOWER(campaign.name) LIKE '%ctv%'
        OR JSON_VALUE(original_json, '$.type') LIKE '%CTV%'
      )
    GROUP BY 1
    ORDER BY spend DESC
    """
    return run_query(client, query)


def get_ctv_by_vertical(client, days=90):
    """CTV spend broken down by vertical using Dan's UDF."""
    query = f"""
    WITH fraud_platforms AS (
      SELECT DISTINCT UPPER(platform) AS platform
      FROM `moloco-data-prod.gtm.payment_fraud_account`
    )
    
    SELECT
      `moloco-data-prod.gtm.vertical_classifier_2`(
        product.is_gaming,
        advertiser.migrated_platform,
        advertiser_id,
        product.genre,
        product.sub_genre,
        product.iab_category_desc,
        product.app_name,
        product.app_market_bundle,
        campaign.os,
        date_utc
      ) AS vertical,
      ROUND(SUM(gross_spend_usd), 2) AS spend,
      CAST(SUM(conversions) AS INT64) AS conversions,
      COUNT(DISTINCT tracking_entity) AS advertisers,
      COUNT(DISTINCT campaign_id) AS campaigns
    FROM `moloco-ae-view.athena.fact_dsp_core` fdc
    LEFT JOIN fraud_platforms
      ON fdc.advertiser.migrated_platform = fraud_platforms.platform
    WHERE date_utc >= DATE_SUB(CURRENT_DATE(), INTERVAL {days} DAY)
      AND moloco_product = "DSP"
      AND fraud_platforms.platform IS NULL
      AND (
        LOWER(exchange) LIKE '%ctv%'
        OR LOWER(exchange) LIKE '%roku%'
        OR LOWER(exchange) LIKE '%tubi%'
        OR LOWER(exchange) LIKE '%samsung%'
        OR LOWER(exchange) LIKE '%vizio%'
        OR LOWER(exchange) LIKE '%lg%'
        OR LOWER(exchange) LIKE '%pluto%'
        OR LOWER(exchange) LIKE '%freevee%'
        OR LOWER(exchange) LIKE '%peacock%'
        OR LOWER(exchange) LIKE '%fubo%'
        OR LOWER(exchange) LIKE '%sling%'
        OR LOWER(exchange) LIKE '%philo%'
        OR LOWER(campaign.name) LIKE '%CTV%'
        OR LOWER(campaign.name) LIKE '%ctv%'
        OR JSON_VALUE(original_json, '$.type') LIKE '%CTV%'
      )
    GROUP BY 1
    ORDER BY spend DESC
    """
    return run_query(client, query)


def get_overall_dsp_summary(client, days=90):
    """
    Overall DSP spend (not just CTV) for context on CTV's share.
    """
    query = f"""
    WITH fraud_platforms AS (
      SELECT DISTINCT UPPER(platform) AS platform
      FROM `moloco-data-prod.gtm.payment_fraud_account`
    )
    
    SELECT
      DATE_TRUNC(date_utc, MONTH) AS month,
      ROUND(SUM(gross_spend_usd), 2) AS total_dsp_spend,
      CAST(SUM(conversions) AS INT64) AS total_conversions,
      COUNT(DISTINCT tracking_entity) AS unique_advertisers
    FROM `moloco-ae-view.athena.fact_dsp_core` fdc
    LEFT JOIN fraud_platforms
      ON fdc.advertiser.migrated_platform = fraud_platforms.platform
    WHERE date_utc >= DATE_SUB(CURRENT_DATE(), INTERVAL {days} DAY)
      AND moloco_product = "DSP"
      AND fraud_platforms.platform IS NULL
    GROUP BY 1
    ORDER BY 1
    """
    return run_query(client, query)


def get_eog_targets(client):
    """
    Pull EOQ targets and attainment from daily_attainment_table.
    Uses Dan's pattern: Growth = MAX(eoq_target), NBS = SUM(eoq_target).
    """
    query = """
    WITH latest_snapshot AS (
      SELECT
        MAX(max_date) AS latest_date,
        (SELECT MAX(quarter) FROM `moloco-data-prod.gtm.daily_attainment_table`
         WHERE max_date = (SELECT MAX(max_date) FROM `moloco-data-prod.gtm.daily_attainment_table`)) AS current_quarter
      FROM `moloco-data-prod.gtm.daily_attainment_table`
    ),
    
    growth_targets AS (
      SELECT
        tracking_entity,
        MAX(eoq_target) AS quarterly_target,
        MAX(COALESCE(sales_forecast, 0)) AS forecast
      FROM `moloco-data-prod.gtm.daily_attainment_table`, latest_snapshot
      WHERE max_date = latest_date
        AND quarter = current_quarter
        AND age_group != 'New'
      GROUP BY 1
    ),
    
    nbs_targets AS (
      SELECT
        tracking_entity,
        SUM(eoq_target) AS quarterly_target,
        SUM(COALESCE(sales_forecast, 0)) AS forecast
      FROM `moloco-data-prod.gtm.daily_attainment_table`, latest_snapshot
      WHERE quarter = current_quarter
        AND age_group = 'New'
      GROUP BY 1
    )
    
    SELECT
      'Growth' AS segment,
      COUNT(DISTINCT tracking_entity) AS entities,
      ROUND(SUM(quarterly_target), 2) AS total_target,
      ROUND(SUM(forecast), 2) AS total_forecast
    FROM growth_targets
    
    UNION ALL
    
    SELECT
      'NBS' AS segment,
      COUNT(DISTINCT tracking_entity) AS entities,
      ROUND(SUM(quarterly_target), 2) AS total_target,
      ROUND(SUM(forecast), 2) AS total_forecast
    FROM nbs_targets
    
    UNION ALL
    
    SELECT
      'TOTAL' AS segment,
      (SELECT COUNT(DISTINCT tracking_entity) FROM growth_targets) + (SELECT COUNT(DISTINCT tracking_entity) FROM nbs_targets) AS entities,
      (SELECT ROUND(SUM(quarterly_target), 2) FROM growth_targets) + (SELECT ROUND(SUM(quarterly_target), 2) FROM nbs_targets) AS total_target,
      (SELECT ROUND(SUM(forecast), 2) FROM growth_targets) + (SELECT ROUND(SUM(forecast), 2) FROM nbs_targets) AS total_forecast
    """
    return run_query(client, query)


def main():
    """Run all CTV revenue queries and output as JSON."""
    mode = sys.argv[1] if len(sys.argv) > 1 else "full"
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 90
    
    client = get_client()
    
    result = {}
    
    if mode in ("full", "summary"):
        result["ctv_monthly"] = get_ctv_revenue_summary(client, days)
    
    if mode in ("full", "advertisers"):
        result["ctv_advertisers"] = get_ctv_by_advertiser(client, days)
    
    if mode in ("full", "weekly"):
        result["ctv_weekly"] = get_ctv_weekly_trend(client, weeks=max(1, days // 7))
    
    if mode in ("full", "region"):
        result["ctv_by_region"] = get_ctv_by_region(client, days)
    
    if mode in ("full", "vertical"):
        result["ctv_by_vertical"] = get_ctv_by_vertical(client, days)
    
    if mode in ("full", "dsp"):
        result["dsp_overall"] = get_overall_dsp_summary(client, days)
    
    if mode in ("full", "targets"):
        result["eoq_targets"] = get_eog_targets(client)
    
    result["metadata"] = {
        "fetched_at": datetime.utcnow().isoformat(),
        "days_lookback": days,
        "mode": mode,
        "source": "BigQuery (moloco-ae-view)",
        "auth": "ADC (mayukh.chowdhury@moloco.com)",
    }
    
    print(json.dumps(result, default=str))


if __name__ == "__main__":
    main()
