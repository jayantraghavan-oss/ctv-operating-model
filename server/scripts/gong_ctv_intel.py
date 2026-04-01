#!/usr/bin/env python3
"""
Gong CTV Intelligence — Pull CTV-relevant calls, transcripts, and structure for the super view.

Outputs JSON with:
  - matched_calls: list of CTV-advertiser matched calls with Gong deep links
  - call_volume: monthly call counts
  - advertiser_coverage: calls per advertiser
  - transcript_samples: real transcript excerpts from recent calls (for LLM analysis)
  - call_metadata: duration stats, system breakdown, scope breakdown

Usage:
  python3 gong_ctv_intel.py summary          # Call metadata + volume (fast, no transcripts)
  python3 gong_ctv_intel.py transcripts       # Pull transcripts for top recent calls (slower)
  python3 gong_ctv_intel.py full              # Everything
"""

import sys
import os
import json
from datetime import datetime, timedelta
from collections import Counter, defaultdict

sys.path.insert(0, '/home/ubuntu/skills/gong-api/scripts')

try:
    from gong_helper import GongClient
except ImportError:
    print(json.dumps({"error": "gong_helper not found", "available": False}))
    sys.exit(0)

# Known CTV advertisers — cross-referenced with BQ fact_dsp_core data
CTV_ADVERTISERS = [
    'PMG', 'KRAKEN', 'Luckymoney', 'NOVIG', 'FanDuel', 'Rush Street',
    'DraftKings', 'BetMGM', 'Weedmaps', 'Kalshi', 'CBS', 'Noom',
    'ARBGAMING', 'Minimalist', 'Fanatics', 'Experian', 'Tilting Point',
    'Samsung', 'LG', 'Roku', 'Hulu', 'Disney', 'Paramount', 'Peacock',
    'Tubi', 'Pluto', 'Fubo', 'Sling', 'Philo', 'Discovery',
    'Warner', 'Netflix', 'Amazon', 'Apple TV',
    'Caesars', 'PointsBet', 'Barstool', 'Hard Rock', 'Penn',
    'MGM', 'WynnBET', 'Bet365', 'Betway',
    'HelloFresh', 'Blue Apron', 'Peloton', 'Casper', 'Warby',
    'Allbirds', 'Away', 'Glossier', 'Hims',
]


def match_advertiser(title: str) -> str | None:
    """Match a call title to a CTV advertiser name."""
    title_lower = title.lower()
    for adv in CTV_ADVERTISERS:
        if adv.lower() in title_lower:
            return adv
    return None


def pull_calls(client: GongClient, months_back: int = 18) -> list:
    """Pull all calls from the last N months, quarter by quarter."""
    now = datetime.utcnow()
    start = now - timedelta(days=months_back * 30)
    
    all_calls = []
    # Pull in 3-month chunks to handle API pagination
    current = start
    while current < now:
        chunk_end = min(current + timedelta(days=90), now)
        try:
            chunk = client.list_calls(
                from_date=current.strftime('%Y-%m-%dT00:00:00Z'),
                to_date=chunk_end.strftime('%Y-%m-%dT23:59:59Z'),
                limit=500
            )
            all_calls.extend(chunk)
        except Exception as e:
            print(f"Warning: chunk {current.date()} to {chunk_end.date()} failed: {e}", file=sys.stderr)
        current = chunk_end + timedelta(days=1)
    
    return all_calls


def build_summary(all_calls: list) -> dict:
    """Build structured summary from matched CTV calls."""
    # Match calls to CTV advertisers
    matched = []
    for c in all_calls:
        adv = match_advertiser(c.get('title', ''))
        if adv:
            matched.append({
                'id': c['id'],
                'url': c['url'],
                'title': c['title'],
                'date': (c.get('scheduled') or c.get('started') or '')[:10],
                'duration_sec': c.get('duration', 0),
                'duration_min': round(c.get('duration', 0) / 60, 1),
                'advertiser': adv,
                'system': c.get('system', 'Unknown'),
                'scope': c.get('scope', 'Unknown'),
                'media': c.get('media', 'Unknown'),
            })
    
    # Sort by date descending
    matched.sort(key=lambda x: x['date'], reverse=True)
    
    # Monthly volume
    monthly = defaultdict(int)
    for m in matched:
        month_key = m['date'][:7]  # YYYY-MM
        if month_key:
            monthly[month_key] += 1
    
    # Advertiser coverage
    adv_counts = Counter(m['advertiser'] for m in matched)
    
    # Duration stats
    durations = [m['duration_sec'] for m in matched if m['duration_sec'] > 0]
    duration_stats = {
        'avg_min': round(sum(durations) / len(durations) / 60, 1) if durations else 0,
        'median_min': round(sorted(durations)[len(durations) // 2] / 60, 1) if durations else 0,
        'total_hours': round(sum(durations) / 3600, 1) if durations else 0,
    }
    
    # Scope breakdown (External vs Internal)
    scope_counts = Counter(m['scope'] for m in matched)
    
    # System breakdown (Zoom, Google Meet, etc.)
    system_counts = Counter(m['system'] for m in matched)
    
    return {
        'available': True,
        'fetched_at': datetime.utcnow().isoformat() + 'Z',
        'total_calls_scanned': len(all_calls),
        'ctv_matched_calls': len(matched),
        'matched_calls': matched,  # Full list with Gong URLs
        'monthly_volume': dict(sorted(monthly.items())),
        'advertiser_coverage': [
            {'advertiser': adv, 'call_count': count}
            for adv, count in adv_counts.most_common(30)
        ],
        'duration_stats': duration_stats,
        'scope_breakdown': dict(scope_counts),
        'system_breakdown': dict(system_counts),
        'unique_advertisers': len(adv_counts),
        'date_range': {
            'earliest': matched[-1]['date'] if matched else None,
            'latest': matched[0]['date'] if matched else None,
        },
    }


def pull_transcripts(client: GongClient, matched_calls: list, max_calls: int = 15) -> list:
    """Pull transcripts for the most recent CTV calls.
    
    Returns list of {call_id, url, title, advertiser, date, transcript_excerpt}.
    Limits to max_calls to avoid API rate limits.
    """
    # Take most recent calls, prioritizing diversity of advertisers
    seen_advertisers = set()
    selected = []
    
    # First pass: one call per advertiser (most recent)
    for call in matched_calls:
        if call['advertiser'] not in seen_advertisers and len(selected) < max_calls:
            selected.append(call)
            seen_advertisers.add(call['advertiser'])
    
    # Second pass: fill remaining slots with most recent
    for call in matched_calls:
        if len(selected) >= max_calls:
            break
        if call not in selected:
            selected.append(call)
    
    transcripts = []
    for call in selected[:max_calls]:
        try:
            text = client.get_transcript_text(call['id'])
            if text:
                # Take first 2000 chars as excerpt (enough for LLM analysis)
                transcripts.append({
                    'call_id': call['id'],
                    'url': call['url'],
                    'title': call['title'],
                    'advertiser': call['advertiser'],
                    'date': call['date'],
                    'duration_min': call['duration_min'],
                    'transcript_excerpt': text[:2000],
                    'transcript_length': len(text),
                    'has_full_transcript': True,
                })
        except Exception as e:
            transcripts.append({
                'call_id': call['id'],
                'url': call['url'],
                'title': call['title'],
                'advertiser': call['advertiser'],
                'date': call['date'],
                'duration_min': call['duration_min'],
                'transcript_excerpt': f'[Transcript unavailable: {str(e)[:100]}]',
                'transcript_length': 0,
                'has_full_transcript': False,
            })
    
    return transcripts


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'summary'
    
    try:
        client = GongClient()
    except Exception as e:
        print(json.dumps({
            'available': False,
            'error': f'Gong API initialization failed: {str(e)[:200]}',
        }))
        return
    
    try:
        all_calls = pull_calls(client, months_back=18)
        summary = build_summary(all_calls)
        
        if mode in ('transcripts', 'full'):
            transcript_data = pull_transcripts(client, summary['matched_calls'], max_calls=15)
            summary['transcript_samples'] = transcript_data
            summary['transcripts_pulled'] = len(transcript_data)
        
        # For summary mode, don't include full call list (too large for JSON response)
        if mode == 'summary':
            # Keep only top 50 most recent calls in the response
            summary['matched_calls'] = summary['matched_calls'][:50]
        
        print(json.dumps(summary, default=str))
        
    except Exception as e:
        print(json.dumps({
            'available': False,
            'error': f'Gong data fetch failed: {str(e)[:200]}',
        }))


if __name__ == '__main__':
    main()
