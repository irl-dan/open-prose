# OpenProse API

Backend API service for OpenProse, hosted on [Fly.io](https://fly.io).

**Production URL:** https://api.prose.md

## Purpose

This API provides:

1. **Telemetry ingestion** — Collects anonymous usage metrics from the OpenProse plugin to understand feature adoption
2. **Stats endpoint** — Simple aggregations for dashboarding

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check, returns `{ status: "ok", timestamp }` |
| `/v1/telemetry` | POST | Ingest telemetry events from the plugin |
| `/v1/stats` | GET | Aggregated statistics (total events, unique installs, by version) |

### Telemetry Payload

The plugin sends anonymous usage data on each compile. See `src/telemetry-types.ts` for the full schema.

**Privacy-safe by design:**
- No prompt text or string content
- No variable or agent names
- No file paths
- Only feature usage counts and program metrics
- Anonymous install ID (UUID, no PII)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  OpenProse      │     │   Fly.io        │     │   SQLite        │
│  Plugin         │────▶│   Express API   │────▶│   (Volume)      │
│  (compile)      │     │   api.prose.md  │     │   /data/*.db    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

- **Runtime:** Node.js 20 on Fly.io (sjc region)
- **Database:** SQLite on persistent volume (1GB)
- **DNS:** Route 53 → Fly.io (A/AAAA records)
- **SSL:** Let's Encrypt (auto-renewed by Fly.io)

## Local Development

```bash
# Install dependencies
npm install

# Run in development mode (auto-reload)
npm run dev

# Build for production
npm run build

# Type check
npm run lint
```

The dev server runs on http://localhost:3001.

## Deployment

### Initial Setup (Already Done)

These steps were performed to set up the production environment:

```bash
# 1. Authenticate with Fly.io
fly auth login

# 2. Create the app
fly apps create openprose-api

# 3. Create persistent volume for SQLite (1GB, sjc region)
fly volumes create openprose_data --region sjc --size 1 --app openprose-api

# 4. Deploy
cd api
fly deploy

# 5. Add custom domain certificate
fly certs add api.prose.md --app openprose-api

# 6. Create DNS records (via Terraform)
cd ../infra
terraform apply
```

### Subsequent Deploys

```bash
cd api
fly deploy
```

Or push to `main` branch (if GitHub Actions CI/CD is configured).

### Useful Commands

```bash
# Check app status
fly status --app openprose-api

# View logs
fly logs --app openprose-api

# SSH into the machine
fly ssh console --app openprose-api

# Check certificate status
fly certs check api.prose.md --app openprose-api

# Scale (if needed)
fly scale count 2 --app openprose-api
```

## Infrastructure

The DNS records are managed via Terraform in `../infra/api.tf`:

```hcl
# A record for IPv4
resource "aws_route53_record" "api" {
  name    = "api.prose.md"
  type    = "A"
  records = ["66.241.124.142"]
}

# AAAA record for IPv6
resource "aws_route53_record" "api_ipv6" {
  name    = "api.prose.md"
  type    = "AAAA"
  records = ["2a09:8280:1::c0:44ba:0"]
}
```

## Configuration

Environment variables (set in `fly.toml`):

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `DATABASE_PATH` | SQLite database path | `/data/telemetry.db` |
| `PORT` | Server port | `3000` |

## Database

SQLite with WAL mode for better concurrent reads. Schema:

```sql
CREATE TABLE telemetry_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  install_id TEXT NOT NULL,
  plugin_version TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  payload TEXT NOT NULL  -- Full JSON payload
);
```

The full payload is stored as JSON for flexibility in querying feature-level metrics.

## Costs

Fly.io free tier includes:
- 3 shared-cpu-1x VMs (256MB each)
- 3GB persistent volume storage
- 160GB outbound bandwidth

This API uses:
- 1 shared-cpu-1x VM (256MB)
- 1GB volume

Well within free tier for expected usage.
