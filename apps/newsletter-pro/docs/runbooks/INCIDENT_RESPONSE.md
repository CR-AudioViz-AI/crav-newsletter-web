# Newsletter Pro - Incident Response Runbook

## Severity Levels

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| **P0 - Critical** | Complete service outage, data loss | Immediate | Database down, all emails failing |
| **P1 - High** | Major feature broken, affecting all users | 30 minutes | Campaign scheduling broken |
| **P2 - Medium** | Feature degraded, workaround available | 2 hours | Metrics not updating |
| **P3 - Low** | Minor issue, cosmetic bug | Next business day | UI styling issue |

---

## P0: Complete Service Outage

### Symptoms
- Health check failing
- 500 errors on all requests
- Database unreachable
- All email sends failing

### Immediate Actions (within 5 minutes)

1. **Acknowledge incident** in PagerDuty
2. **Create incident channel** in Slack: `#incident-YYYY-MM-DD`
3. **Announce** in `#engineering`: "P0 incident declared for Newsletter Pro"
4. **Assign roles:**
   - Incident Commander: On-call engineer
   - Communications Lead: Engineering manager
   - Technical Lead: Senior engineer

### Diagnosis Steps

```bash
# 1. Check health endpoint
curl https://newsletter.crav.io/api/health

# 2. Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# 3. Check application logs
tail -100 /var/log/newsletter-pro/app.log
# or CloudWatch Logs

# 4. Check infrastructure
aws ecs describe-services --cluster newsletter-prod --services newsletter-pro
# or equivalent for your platform

# 5. Check dependencies
curl https://credits-api.crav.io/health
curl https://sso.crav.io/health
```

### Common Causes & Fixes

**Cause 1: Database Connection Pool Exhausted**
```bash
# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '5 minutes';"

# Restart application to reset pool
sudo systemctl restart newsletter-pro
```

**Cause 2: Out of Memory**
```bash
# Check memory usage
free -h
docker stats

# Restart service
sudo systemctl restart newsletter-pro

# Increase memory limits (then redeploy)
# Update task definition or systemd config
```

**Cause 3: Bad Deployment**
```bash
# Rollback to previous version
vercel rollback
# or
git checkout v1.0.0
npm ci && npm run build
sudo systemctl restart newsletter-pro
```

**Cause 4: Third-Party Dependency Down**
```bash
# Check Credits API
curl https://credits-api.crav.io/health

# Check SSO
curl https://sso.crav.io/health

# If Credits API down: disable credit checks temporarily
# Update env: CREDITS_API_ENABLED=false
# Redeploy

# If SSO down: switch to dev mode temporarily (ONLY in emergency)
# Update env: AUTH_MODE=dev
# Redeploy
```

### Resolution

1. Verify service is healthy
2. Monitor for 30 minutes to ensure stability
3. Update incident channel with resolution
4. Schedule post-mortem within 24 hours

---

## P1: Campaign Scheduling Broken

### Symptoms
- Users cannot schedule campaigns
- Campaigns stuck in "pending" status
- Errors in `/api/trpc/campaigns.schedule`

### Diagnosis

```bash
# Check recent logs
grep "schedule" /var/log/newsletter-pro/app.log | tail -100

# Check campaign status
psql $DATABASE_URL -c "SELECT id, status, created_at FROM campaigns WHERE status = 'pending' ORDER BY created_at DESC LIMIT 20;"

# Check credit ledger
psql $DATABASE_URL -c "SELECT * FROM credit_ledger WHERE status = 'pending' ORDER BY created_at DESC LIMIT 20;"

# Test schedule manually
curl -X POST https://newsletter.crav.io/api/trpc/campaigns.schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"test-id"}'
```

### Common Causes

**Cause 1: Credits API Timeout**
```bash
# Check Credits API response time
time curl https://credits-api.crav.io/health

# If slow/down: implement retry with backoff
# Or: temporarily allow scheduling without credits
```

**Cause 2: Database Lock**
```bash
# Check for locks
psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Kill blocking queries
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid IN (SELECT pid FROM pg_locks WHERE NOT granted);"
```

**Cause 3: Rate Limiting**
```bash
# Check rate limit logs
grep "rate limit" /var/log/newsletter-pro/app.log

# Temporarily increase limits
# Update RATE_LIMIT_SCHEDULE=100 in env
# Redeploy
```

---

## P1: High Bounce Rate Alert

### Symptoms
- Alert: "Bounce rate > 5% for last hour"
- Complaints about emails not delivered

### Diagnosis

```bash
# Check bounce rate
psql $DATABASE_URL << EOF
SELECT
  COUNT(*) FILTER (WHERE type = 'bounce') * 100.0 / COUNT(*) as bounce_rate,
  COUNT(*) as total_sends
FROM email_events
WHERE occurred_at > now() - interval '1 hour';
EOF

# Check bounced domains
psql $DATABASE_URL << EOF
SELECT
  split_part(email, '@', 2) as domain,
  COUNT(*) as bounce_count
FROM email_events e
JOIN subscribers s ON e.subscriber_id = s.id
WHERE e.type = 'bounce'
AND e.occurred_at > now() - interval '1 hour'
GROUP BY domain
ORDER BY bounce_count DESC
LIMIT 10;
EOF

# Check SES sending metrics
aws ses get-send-statistics --region us-west-2
```

### Actions

**If specific domain bouncing:**
```bash
# Temporarily suppress domain
psql $DATABASE_URL << EOF
INSERT INTO unsubscribes (org_id, email, reason, source)
SELECT
  s.org_id,
  s.email,
  'High bounce rate',
  'auto_suppression'
FROM subscribers s
WHERE split_part(s.email, '@', 2) = 'problematic-domain.com'
ON CONFLICT DO NOTHING;
EOF
```

**If DKIM/SPF issue:**
```bash
# Verify DNS records
dig TXT _dmarc.yourdomain.com
dig TXT default._domainkey.yourdomain.com

# Check SES domain verification
aws ses get-identity-verification-attributes \
  --identities yourdomain.com \
  --region us-west-2
```

**If hitting rate limits:**
```bash
# Check SES sending quota
aws ses get-send-quota --region us-west-2

# Request quota increase via AWS Support
# Or: slow down send rate
```

---

## P2: Metrics Not Updating

### Symptoms
- Campaign dashboard shows stale metrics
- Event counts not incrementing

### Diagnosis

```bash
# Check recent events
psql $DATABASE_URL << EOF
SELECT type, COUNT(*), MAX(occurred_at)
FROM email_events
WHERE occurred_at > now() - interval '10 minutes'
GROUP BY type;
EOF

# Check webhook endpoint
curl -X POST https://newsletter.crav.io/api/provider/webhook \
  -H "Content-Type: application/json" \
  -d '{"Type":"Notification","Message":"{\"eventType\":\"Delivery\"}"}'

# Check for webhook errors
grep "webhook" /var/log/newsletter-pro/app.log | grep "error"
```

### Common Causes

**Cause: SNS Subscription Not Delivering**
```bash
# Check SNS subscription status
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-west-2:xxx:ses-events \
  --region us-west-2

# Re-subscribe if needed
aws sns subscribe \
  --topic-arn arn:aws:sns:us-west-2:xxx:ses-events \
  --protocol https \
  --notification-endpoint https://newsletter.crav.io/api/provider/webhook
```

**Cause: Idempotency Table Full**
```bash
# Clean up old keys (keep 7 days)
psql $DATABASE_URL << EOF
DELETE FROM idempotency_keys
WHERE created_at < now() - interval '7 days';
EOF
```

---

## Communication Templates

### P0 Announcement (Slack)

```
🚨 P0 INCIDENT DECLARED 🚨

Service: Newsletter Pro
Issue: [Brief description]
Impact: [Who/what is affected]
Status: Investigating
Incident Channel: #incident-2025-10-10
ETA: Updates every 15 minutes

Incident Commander: @engineer
```

### P0 Resolution (Slack)

```
✅ P0 INCIDENT RESOLVED ✅

Service: Newsletter Pro
Issue: [Brief description]
Resolution: [What was done]
Duration: X hours Y minutes
Post-mortem: [Link to doc]

Thank you for your patience. Service is now stable.
```

### Customer Communication (Email)

```
Subject: [Action Required] Newsletter Pro Service Interruption - Resolved

Dear Newsletter Pro Users,

We experienced a service interruption on [date] from [time] to [time] UTC.

What happened:
[Brief explanation in plain English]

Impact:
[What users experienced]

Resolution:
[What we did to fix it]

Prevention:
[What we're doing to prevent recurrence]

We apologize for the disruption and appreciate your patience.

If you have questions, contact support@crav.io

- The Newsletter Pro Team
```

---

## Post-Incident Process

### Within 24 Hours

1. **Create post-mortem document**
   - Template: `docs/postmortems/YYYY-MM-DD-incident-name.md`
   - Include: Timeline, root cause, impact, resolution, action items

2. **Schedule post-mortem meeting**
   - Invite: Engineering team, Product, relevant stakeholders
   - Duration: 60 minutes
   - Goal: Learn, not blame

3. **Create action items**
   - Add to backlog with priority
   - Assign owners
   - Set deadlines

### Post-Mortem Template

```markdown
# Post-Mortem: [Incident Name]

**Date:** YYYY-MM-DD
**Severity:** P0/P1/P2
**Duration:** X hours Y minutes
**Author:** [Name]

## Summary
[2-3 sentence description]

## Timeline (all times UTC)
- 14:00: Issue detected
- 14:05: Incident declared
- 14:10: Root cause identified
- 14:30: Fix deployed
- 14:45: Service restored
- 15:00: Incident closed

## Impact
- Users affected: X
- Failed requests: Y
- Revenue impact: $Z

## Root Cause
[Technical explanation of what caused the issue]

## Resolution
[What was done to fix it]

## Action Items
1. [ ] Improve monitoring (Owner: @engineer, Due: YYYY-MM-DD)
2. [ ] Add alerting (Owner: @engineer, Due: YYYY-MM-DD)
3. [ ] Update runbook (Owner: @engineer, Due: YYYY-MM-DD)

## Lessons Learned
- What went well
- What could be improved
- Surprises

## Detection & Response
- How was it detected?
- What tools were used?
- What was helpful?
- What was missing?
```

---

## Escalation Path

1. **On-Call Engineer** (first responder)
2. **Engineering Manager** (if unresolved after 30 min)
3. **VP Engineering** (if critical & unresolved after 1 hour)
4. **CTO** (if business-critical & unresolved after 2 hours)

---

## Useful Queries

### Check System Health

```sql
-- Active campaigns in last hour
SELECT COUNT(*) FROM campaigns WHERE created_at > now() - interval '1 hour';

-- Send success rate
SELECT
  COUNT(*) FILTER (WHERE status = 'sent') * 100.0 / COUNT(*) as success_rate
FROM sends
WHERE created_at > now() - interval '1 hour';

-- Event lag (time between send and delivery)
SELECT
  AVG(EXTRACT(EPOCH FROM (e.occurred_at - s.created_at))) as avg_delivery_seconds
FROM email_events e
JOIN sends s ON e.send_id = s.id
WHERE e.type = 'delivered'
AND e.occurred_at > now() - interval '1 hour';

-- Database connection count
SELECT count(*) FROM pg_stat_activity;

-- Long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;
```

---

## Emergency Maintenance Mode

If you need to take the service down for emergency maintenance:

```bash
# 1. Enable maintenance mode (returns 503)
export MAINTENANCE_MODE=true

# 2. Restart service
sudo systemctl restart newsletter-pro

# 3. Verify 503 response
curl -I https://newsletter.crav.io
# Should return: HTTP/1.1 503 Service Unavailable

# 4. Perform maintenance
# ...

# 5. Disable maintenance mode
export MAINTENANCE_MODE=false
sudo systemctl restart newsletter-pro

# 6. Verify service healthy
curl https://newsletter.crav.io/api/health
```

---

## Contact Information

**PagerDuty:** https://crav.pagerduty.com/incidents
**Slack:** #incidents
**Status Page:** https://status.crav.io
**Support Email:** support@crav.io
