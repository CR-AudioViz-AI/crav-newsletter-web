# Newsletter Pro - Operations Guide

## Environment Variables

### Required (Production)
```bash
# Application
NODE_ENV=production
APP_MODE=prod
NEXT_PUBLIC_APP_URL=https://newsletter.crav.io

# Database
DATABASE_URL=postgresql://user:pass@host:5432/newsletter
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Authentication
AUTH_MODE=sso
CRAV_SSO_ISSUER=https://sso.crav.io
CRAV_SSO_JWKS_URL=https://sso.crav.io/.well-known/jwks.json

# Credits API
CREDITS_API_URL=https://credits-api.crav.io
CREDITS_API_KEY=prod-key-here

# AWS SES
AWS_SES_REGION=us-west-2
AWS_SES_ACCESS_KEY_ID=AKIA...
AWS_SES_SECRET_ACCESS_KEY=...
AWS_SES_CONFIGURATION_SET=newsletter-prod
SES_FROM_EMAIL=no-reply@newsletter.crav.io

# Observability
LOG_LEVEL=info
SENTRY_DSN=https://...@sentry.io/...
DD_API_KEY=...

# Rate Limiting
REDIS_URL=redis://prod-redis:6379
```

### Optional
```bash
# Feature flags
ENABLE_CSV_IMPORT=true
ENABLE_TEMPLATE_EDITOR=true
ENABLE_CAMPAIGN_SCHEDULING=true

# Debugging (staging only)
DEBUG=newsletter:*
SKIP_ENV_VALIDATION=false
```

## Ports

- **3000**: Next.js application (HTTP)
- **5432**: PostgreSQL (if self-hosted)
- **6379**: Redis (if used for rate limiting)

## Health Checks

### Application Health
```bash
curl https://newsletter.crav.io/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-10-10T...",
  "version": "1.0.0"
}
```

### Database Health
```bash
psql $DATABASE_URL -c "SELECT 1"
```

### SES Health
```bash
aws ses get-send-quota --region us-west-2
```

### Credits API Health
```bash
curl https://credits-api.crav.io/health
```

## Backup & Restore

### Automated Backups (Supabase)
- Enabled via Supabase dashboard
- Retention: 30 days (production), 7 days (staging)
- Schedule: Daily at 02:00 UTC

### Manual Backup
```bash
# Full database dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Specific tables only
pg_dump $DATABASE_URL \
  -t campaigns \
  -t subscribers \
  -t email_events \
  > backup-core-tables.sql
```

### Restore from Backup
```bash
# WARNING: This will overwrite data!

# Step 1: Create new database
createdb newsletter_restore

# Step 2: Restore dump
psql newsletter_restore < backup-20251010.sql

# Step 3: Verify
psql newsletter_restore -c "SELECT COUNT(*) FROM campaigns;"

# Step 4: Swap (if verified)
# Update DATABASE_URL to point to newsletter_restore
```

## Monitoring

### Key Metrics

**Application Metrics:**
- `http.requests.total` - Total HTTP requests
- `http.requests.duration_ms` - Request latency (p50, p95, p99)
- `http.requests.errors` - Error count by status code

**Email Metrics:**
- `email.sends.total` - Total emails sent
- `email.sends.rate` - Sends per minute
- `email.delivered.total` - Successful deliveries
- `email.bounces.total` - Bounce count
- `email.opens.total` - Open count
- `email.clicks.total` - Click count

**Credits Metrics:**
- `credits.authorizations.total` - Authorization requests
- `credits.authorizations.success` - Successful authorizations
- `credits.commits.total` - Commit requests
- `credits.reverts.total` - Revert requests

**Webhook Metrics:**
- `webhook.received.total` - Webhooks received
- `webhook.processed.total` - Webhooks processed
- `webhook.failed.total` - Failed webhooks
- `webhook.duration_ms` - Processing time

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate | > 1% | > 5% |
| Response time (p99) | > 2s | > 5s |
| Bounce rate | > 3% | > 5% |
| Webhook failures | > 2% | > 5% |
| Database connections | > 80% | > 95% |

## Log Formats

### Application Logs (JSON)
```json
{
  "level": "info",
  "message": "Campaign scheduled",
  "timestamp": "2025-10-10T12:00:00Z",
  "request_id": "req_abc123",
  "org_id": "org_xyz789",
  "campaign_id": "camp_456",
  "duration_ms": 150
}
```

### Metrics Logs (JSON)
```json
{
  "type": "counter",
  "name": "email.sends.total",
  "value": 1,
  "tags": {"org_id": "org_xyz", "status": "sent"},
  "timestamp": "2025-10-10T12:00:00Z"
}
```

### PII Redaction
The following fields are automatically redacted:
- `email` → `[REDACTED]`
- `name`, `first_name`, `last_name` → `[REDACTED]`
- `phone`, `address` → `[REDACTED]`

## Security

### Secret Rotation Schedule
- **API Keys**: Every 90 days
- **Database Passwords**: Every 180 days
- **JWT Secrets**: Every 365 days

### Access Control
- **Production Database**: Only service accounts
- **Staging Database**: Engineering team
- **Logs**: Engineering + SRE teams
- **Metrics**: Engineering + Product teams

### Compliance
- GDPR: Data retention 7 years, deletion on request
- CAN-SPAM: Unsubscribe link in all emails
- SOC 2: Audit logs retained 1 year

## Troubleshooting

### High CPU Usage
```bash
# Check top processes
top -b -n 1

# Check slow queries
psql $DATABASE_URL -c "
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC
LIMIT 10;
"
```

### High Memory Usage
```bash
# Check memory
free -h

# Check Node.js heap
node --max-old-space-size=4096 server.js
```

### Disk Space Full
```bash
# Check disk usage
df -h

# Find large files
du -sh /* | sort -h

# Clean old logs
find /var/log -name "*.log" -mtime +7 -delete

# Vacuum database
psql $DATABASE_URL -c "VACUUM FULL;"
```

## Scaling

### Vertical Scaling
- Increase CPU/RAM via hosting provider dashboard
- Requires brief downtime (< 5 minutes)

### Horizontal Scaling
- Add more application instances
- Use load balancer to distribute traffic
- Share session state via Redis

### Database Scaling
- Enable read replicas for queries
- Use connection pooling (PgBouncer)
- Partition large tables (email_events, sends)

## Maintenance Windows

**Preferred:** Sunday 02:00-06:00 UTC (low traffic)

**Procedure:**
1. Notify users 48h in advance
2. Enable maintenance mode
3. Perform updates
4. Run smoke tests
5. Disable maintenance mode
6. Monitor for 1 hour

## Contact Information

- **On-Call:** PagerDuty rotation
- **Slack:** #newsletter-pro-alerts
- **Email:** newsletter-team@crav.io
- **Status Page:** https://status.crav.io
