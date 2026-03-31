# Moloco BigQuery Reference Guide - CTV Revenue Queries

## Core Tables
- `moloco-ae-view.athena.fact_dsp_core` — Primary DSP campaign performance (spend, installs, conversions, ROAS)
- `moloco-ae-view.athena.fact_dsp_summary_for_reporting` — Pre-aggregated high-level metrics
- `moloco-data-prod.gtm.daily_attainment_table` — EOQ targets and forecasts

## Key Fields
- `gross_spend_usd` — The spend field (GAS = Gross Ad Spend)
- `tracking_entity` — Advertiser identifier
- `moloco_product = "DSP"` — Required filter for DSP tables
- `date_utc` — Partition key for most tables

## CTV Filter
For CTV-specific queries, filter on exchange or campaign type that indicates CTV inventory.

## Fraud Filtering (Required)
```sql
WITH fraud_platforms AS (
  SELECT DISTINCT UPPER(platform) AS platform
  FROM `moloco-data-prod.gtm.payment_fraud_account`
)
-- Then LEFT JOIN and WHERE fraud_platforms.platform IS NULL
```

## EOQ Target vs Actual (Critical for Revenue Reporting)
- Growth (age_group != 'New'): `MAX(eoq_target)` per entity on latest max_date
- NBS (age_group = 'New'): `SUM(eoq_target)` across full quarter
- Latest snapshot: `SELECT MAX(max_date) FROM daily_attainment_table`

## Vertical Classification
Use UDF: `moloco-data-prod.gtm.vertical_classifier_2`(...)
