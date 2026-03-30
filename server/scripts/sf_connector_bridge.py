#!/usr/bin/env python3
"""
Salesforce Connector Bridge — Called by Node.js server via subprocess.
Pulls pipeline data, top accounts, recent wins/losses.
Outputs JSON to stdout.
"""
import sys
import json
import argparse

sys.path.insert(0, "/home/ubuntu/skills/salesforce-connector/scripts")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--account", type=str, default=None)
    args = parser.parse_args()

    try:
        from sf_connector import get_sf, sf_keepalive
        sf = get_sf()
        sf_keepalive()

        result = {"pipeline": [], "top_accounts": [], "recent_wins": [], "recent_losses": [], "pipeline_total": 0, "summary": ""}

        # Pipeline by stage
        try:
            pipeline_data = sf.query(
                "SELECT StageName, COUNT(Id) cnt, SUM(Amount) total "
                "FROM Opportunity WHERE IsClosed = false AND Amount > 0 "
                "GROUP BY StageName ORDER BY SUM(Amount) DESC"
            )
            records = pipeline_data if isinstance(pipeline_data, list) else pipeline_data.get("records", [])
            total = 0
            for r in records:
                val = r.get("total", 0) or 0
                result["pipeline"].append({
                    "stage": r.get("StageName", "Unknown"),
                    "count": r.get("cnt", 0),
                    "value": val,
                })
                total += val
            result["pipeline_total"] = total
        except Exception as e:
            result["summary"] += f"Pipeline query error: {str(e)[:80]}. "

        # Top accounts by spend
        try:
            if args.account:
                acct_query = f"SELECT Id, Name, DSP_Spend__c FROM Account WHERE Name LIKE '%{args.account}%' ORDER BY DSP_Spend__c DESC NULLS LAST LIMIT 10"
            else:
                acct_query = "SELECT Id, Name, DSP_Spend__c FROM Account WHERE DSP_Spend__c != null ORDER BY DSP_Spend__c DESC LIMIT 15"
            
            acct_data = sf.query(acct_query)
            records = acct_data if isinstance(acct_data, list) else acct_data.get("records", [])
            for r in records:
                result["top_accounts"].append({
                    "name": r.get("Name", "Unknown"),
                    "spend": r.get("DSP_Spend__c", 0) or 0,
                    "stage": "Active",
                    "nextStep": "Review",
                })
        except Exception as e:
            result["summary"] += f"Account query error: {str(e)[:80]}. "

        # Recent closed-won
        try:
            wins = sf.query(
                "SELECT Name, Amount, CloseDate FROM Opportunity "
                "WHERE StageName = 'Closed Won' AND Amount > 0 "
                "ORDER BY CloseDate DESC LIMIT 10"
            )
            records = wins if isinstance(wins, list) else wins.get("records", [])
            for r in records:
                result["recent_wins"].append({
                    "name": r.get("Name", "Unknown"),
                    "value": r.get("Amount", 0) or 0,
                    "closeDate": r.get("CloseDate", ""),
                })
        except Exception as e:
            result["summary"] += f"Wins query error: {str(e)[:80]}. "

        # Recent closed-lost
        try:
            losses = sf.query(
                "SELECT Name, Amount, Loss_Reason__c FROM Opportunity "
                "WHERE StageName = 'Closed Lost' AND Amount > 0 "
                "ORDER BY CloseDate DESC LIMIT 10"
            )
            records = losses if isinstance(losses, list) else losses.get("records", [])
            for r in records:
                result["recent_losses"].append({
                    "name": r.get("Name", "Unknown"),
                    "value": r.get("Amount", 0) or 0,
                    "lossReason": r.get("Loss_Reason__c", "Not specified") or "Not specified",
                })
        except Exception as e:
            result["summary"] += f"Losses query error: {str(e)[:80]}. "

        if not result["summary"]:
            result["summary"] = f"Pipeline: ${result['pipeline_total']/1e6:.1f}M across {len(result['pipeline'])} stages. {len(result['top_accounts'])} top accounts. {len(result['recent_wins'])} recent wins, {len(result['recent_losses'])} recent losses."

        print(json.dumps(result))

    except ImportError:
        print(json.dumps({"error": "sf_connector not available", "pipeline": [], "top_accounts": [], "recent_wins": [], "recent_losses": [], "pipeline_total": 0, "summary": "Salesforce not configured"}))
    except Exception as e:
        print(json.dumps({"error": str(e), "pipeline": [], "top_accounts": [], "recent_wins": [], "recent_losses": [], "pipeline_total": 0, "summary": f"Salesforce error: {str(e)[:100]}"}))

if __name__ == "__main__":
    main()
