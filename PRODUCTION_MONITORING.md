# Production Monitoring

Quick reference for monitoring OpenProse production systems.

## Quick Status Check

```bash
# Check API health
curl https://api.prose.md/health

# Landing page analytics summary
curl "https://api.prose.md/v1/analytics/stats?metric=pageviews"
curl "https://api.prose.md/v1/analytics/stats?metric=visitors"

# Plugin telemetry summary
curl https://api.prose.md/v1/stats
```

## Infrastructure Overview

| Service | Platform | URL |
|---------|----------|-----|
| Landing Page | AWS S3 + CloudFront | https://www.prose.md |
| API | Fly.io | https://api.prose.md |
| Database | SQLite on Fly.io volume | `/data/telemetry.db` |
| DNS | AWS Route53 | prose.md |

## Landing Page Analytics

The landing page sends events to `https://api.prose.md/v1/analytics` in batches.

### Available Metrics

```bash
# Total pageviews
curl "https://api.prose.md/v1/analytics/stats?metric=pageviews"

# Unique visitors (by anonymous ID)
curl "https://api.prose.md/v1/analytics/stats?metric=visitors"

# Top tracked events
curl "https://api.prose.md/v1/analytics/stats?metric=top_events&limit=10"

# Traffic sources (UTM parameters)
curl "https://api.prose.md/v1/analytics/stats?metric=sources"

# Referrer breakdown
curl "https://api.prose.md/v1/analytics/stats?metric=referrers"

# Bounce rate
curl "https://api.prose.md/v1/analytics/stats?metric=bounce_rate"

# Scroll depth distribution
curl "https://api.prose.md/v1/analytics/stats?metric=scroll_depth"
```

### Time Filtering

Add `from` and `to` parameters (ISO 8601 format):

```bash
# Today's pageviews
curl "https://api.prose.md/v1/analytics/stats?metric=pageviews&from=$(date -u +%Y-%m-%d)"

# Last 7 days
curl "https://api.prose.md/v1/analytics/stats?metric=pageviews&from=$(date -u -v-7d +%Y-%m-%d)"
```

### Tracked Events

| Event | Description |
|-------|-------------|
| `page_exit` | User leaves page (includes time on page, scroll depth) |
| `scroll_depth` | Milestones at 25%, 50%, 75%, 100% |
| `cta_click` | Call-to-action button clicks |
| `nav_click` | Navigation link clicks |
| `faq_expand` | FAQ accordion expansions |
| `donation_click` | Donation tier clicks |
| `inquiry_submit` | Contact form submission |
| `inquiry_success` | Contact form success |
| `inquiry_error` | Contact form error |

## Plugin Telemetry

The Claude Code plugin sends usage telemetry to `https://api.prose.md/v1/telemetry`.

```bash
# Get telemetry summary
curl https://api.prose.md/v1/stats
```

Response:
```json
{
  "totalEvents": 6,
  "uniqueInstalls": 4,
  "byVersion": [
    {"plugin_version": "0.1.0", "count": 4}
  ]
}
```

### What's Collected

- Anonymous install ID (UUID, no PII)
- Plugin version
- Program metrics (line count, statement count, nesting depth)
- Feature usage counts (agents, sessions, loops, etc.)
- Model usage counts
- Import usage counts

**Privacy**: No prompt text, variable names, file paths, or string content is collected.

## Contact Inquiries

```bash
# List recent inquiries
curl "https://api.prose.md/v1/inquiries?limit=10"
```

## Fly.io Monitoring

### View Logs

```bash
# Real-time logs (streaming)
flyctl logs --app openprose-api

# Recent logs (non-streaming)
flyctl logs --app openprose-api --no-tail
```

### Machine Status

```bash
# List machines
flyctl machine list --app openprose-api

# App status
flyctl status --app openprose-api

# Check app in browser
flyctl dashboard --app openprose-api
```

### SSH into Machine

```bash
flyctl ssh console --app openprose-api

# Once connected, inspect database:
sqlite3 /data/telemetry.db "SELECT COUNT(*) FROM analytics_events;"
sqlite3 /data/telemetry.db "SELECT COUNT(*) FROM telemetry_events;"
```

### Configuration

- **Region**: sjc (San Jose, CA)
- **VM**: 256MB RAM, 1 shared CPU
- **Storage**: 1GB persistent volume
- **Auto-scaling**: Scales to 0 when idle, auto-starts on request

## AWS CloudFront Monitoring

The landing page is served via CloudFront. To view CloudFront metrics:

1. Go to AWS Console > CloudFront
2. Select the `prose.md` distribution
3. View "Popular Objects" and "Monitoring" tabs

Or via CLI (requires valid AWS credentials):
```bash
aws cloudfront get-distribution --id <distribution-id>
```

## Database Schema

### analytics_events (landing page)
```sql
id, received_at, type, anonymous_id, user_id, event, name, properties, context, timestamp
```

### telemetry_events (plugin)
```sql
id, received_at, install_id, plugin_version, schema_version, timestamp, payload
```

### inquiries (contact form)
```sql
id, created_at, name, email, company, message, source
```

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/v1/analytics` | Batch ingest analytics events |
| GET | `/v1/analytics/stats` | Query analytics metrics |
| POST | `/v1/telemetry` | Ingest plugin telemetry |
| GET | `/v1/stats` | Query telemetry summary |
| POST | `/v1/inquiries` | Submit contact inquiry |
| GET | `/v1/inquiries` | List inquiries |

## Troubleshooting

### API Not Responding

1. Check machine status: `flyctl status --app openprose-api`
2. If stopped, it will auto-start on next request (may take ~1s)
3. Check logs for errors: `flyctl logs --app openprose-api --no-tail`

### No Analytics Data

1. Verify landing page is sending events (check browser Network tab)
2. Check API is accepting requests: `curl https://api.prose.md/health`
3. Verify database has data via SSH

### Missing Referrer Data

Referrer data depends on browser behavior. Direct visits and some redirects won't have referrer info.
