# Runbook: Queue Stuck or Sends Not Processing

## Symptoms
- Campaigns stuck in "sending" status for > 10 minutes
- No new sends being created
- Event bus queue backing up

## Diagnosis

### Step 1: Check Campaign Status
```sql
SELECT id, title, status, created_at, updated_at
FROM campaigns
WHERE status = 'sending'
AND updated_at < now() - interval '10 minutes'
ORDER BY updated_at DESC;
```

### Step 2: Check Pending Sends
```sql
SELECT COUNT(*) as pending_sends
FROM sends
WHERE status = 'pending'
AND created_at > now() - interval '1 hour';
```

### Step 3: Check Event Bus
```sql
SELECT topic, COUNT(*) as count
FROM event_bus
WHERE created_at > now() - interval '1 hour'
GROUP BY topic
ORDER BY count DESC;
```

### Step 4: Check Application Logs
```bash
grep "campaign.schedule" /var/log/newsletter-pro/app.log | tail -100
grep "ERROR" /var/log/newsletter-pro/app.log | tail -50
```

## Common Causes

### Cause 1: Credits API Down
**Symptom:** Logs show "Credits authorization failed"

**Fix:**
```bash
# Check Credits API health
curl https://credits-api.crav.io/health

# If down, temporarily bypass (emergency only)
# Set env: CREDITS_API_ENABLED=false
# Restart service

# Re-enable after Credits API recovers
```

### Cause 2: Database Connection Pool Exhausted
**Symptom:** Logs show "too many connections"

**Fix:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < now() - interval '5 minutes';

-- Restart application
sudo systemctl restart newsletter-pro
```

### Cause 3: SES Rate Limit Hit
**Symptom:** Logs show "Throttling" or "Rate exceeded"

**Fix:**
```bash
# Check SES sending rate
aws ses get-send-statistics --region us-west-2

# Check quota
aws ses get-send-quota --region us-west-2

# If hitting limit, slow down send rate
# Update campaign scheduler to batch in smaller groups
```

### Cause 4: Dead Worker Process
**Symptom:** No sends processing, but no errors

**Fix:**
```bash
# Check process status
ps aux | grep newsletter-pro

# Restart service
sudo systemctl restart newsletter-pro

# Monitor logs
tail -f /var/log/newsletter-pro/app.log
```

## Recovery Procedures

### Retry Stuck Campaign
```sql
-- Mark campaign as failed
UPDATE campaigns
SET status = 'failed',
    updated_at = now()
WHERE id = 'campaign-id-here';

-- Then manually re-schedule from UI
-- Or via API:
-- POST /api/trpc/campaigns.schedule
```

### Reprocess Failed Sends
```sql
-- Find failed sends
SELECT id, campaign_id, status, error
FROM sends
WHERE status = 'failed'
AND created_at > now() - interval '1 hour';

-- Mark for retry
UPDATE sends
SET status = 'pending',
    retry_count = retry_count + 1,
    updated_at = now()
WHERE status = 'failed'
AND retry_count < 3;
```

### Clear DLQ (Dead Letter Queue)
```sql
-- Review DLQ entries
SELECT * FROM event_bus
WHERE topic = 'webhook.failed'
ORDER BY created_at DESC
LIMIT 100;

-- Manually process or delete
DELETE FROM event_bus
WHERE topic = 'webhook.failed'
AND created_at < now() - interval '24 hours';
```

## Prevention

1. **Monitor queue depth**
   - Alert if pending sends > 1000 for > 5 minutes

2. **Set timeouts**
   - Campaign send timeout: 30 minutes
   - Individual send timeout: 30 seconds

3. **Implement circuit breakers**
   - Auto-pause if error rate > 10%
   - Auto-retry with exponential backoff

4. **Scale horizontally**
   - Add more worker instances during peak load

## Escalation

If issue persists after 30 minutes:
1. Notify #engineering-oncall
2. Check status page: https://status.aws.amazon.com (SES)
3. Check Credits API status
4. Consider rollback to previous deployment
