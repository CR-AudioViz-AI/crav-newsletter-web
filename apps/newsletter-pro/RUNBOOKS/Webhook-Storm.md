# Runbook: Webhook Storm or High Ingest Rate

## Symptoms
- Webhook endpoint returning 500 errors
- High database CPU/connections
- Slow response times on all endpoints
- Alert: "Webhook ingest rate > 1000/min"

## Immediate Actions

### Step 1: Check Current Rate
```bash
# Count webhooks in last minute
psql $DATABASE_URL -c "
SELECT COUNT(*) as webhook_count
FROM email_events
WHERE occurred_at > now() - interval '1 minute';
"

# Check error rate
grep "webhook" /var/log/newsletter-pro/app.log | grep "ERROR" | tail -20
```

### Step 2: Check System Resources
```bash
# Check CPU
top -b -n 1 | head -20

# Check memory
free -h

# Check database connections
psql $DATABASE_URL -c "
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;
"
```

## Mitigation Strategies

### Strategy 1: Enable Rate Limiting
```typescript
// Already implemented in src/lib/rate-limit.ts
// Verify configuration:
{
  webhook: {
    maxTokens: 1000,
    refillRate: 1000,
    refillInterval: 60000, // 1 minute
  }
}
```

### Strategy 2: Batch Event Inserts
```typescript
// Modify webhook processor to batch inserts
const BATCH_SIZE = 100;
const BATCH_TIMEOUT = 5000; // 5 seconds

let eventBatch: WebhookEvent[] = [];
let batchTimer: NodeJS.Timeout;

function addToBatch(event: WebhookEvent) {
  eventBatch.push(event);

  if (eventBatch.length >= BATCH_SIZE) {
    flushBatch();
  } else if (!batchTimer) {
    batchTimer = setTimeout(flushBatch, BATCH_TIMEOUT);
  }
}
```

### Strategy 3: Temporary Queue to Redis
```bash
# If Redis available, buffer events there
# Process asynchronously with worker

# Set env variable
export WEBHOOK_BUFFER_MODE=redis
export REDIS_URL=redis://localhost:6379

# Restart service
sudo systemctl restart newsletter-pro
```

### Strategy 4: Reject Non-Critical Events
```typescript
// Temporarily accept only critical events
const CRITICAL_EVENTS = ['bounce', 'complaint', 'delivered'];

if (!CRITICAL_EVENTS.includes(event.type)) {
  return NextResponse.json(
    { message: 'Event queued for later processing' },
    { status: 202 }
  );
}
```

## Recovery

### Clear Backlog
```sql
-- Check DLQ size
SELECT COUNT(*) FROM event_bus WHERE topic = 'webhook.failed';

-- Process oldest first
SELECT payload
FROM event_bus
WHERE topic = 'webhook.failed'
ORDER BY created_at ASC
LIMIT 100;

-- Delete processed
DELETE FROM event_bus
WHERE topic = 'webhook.failed'
AND created_at < now() - interval '1 hour';
```

### Optimize Database
```sql
-- Add missing index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_events_occurred_at
ON email_events (occurred_at DESC);

-- Vacuum to reclaim space
VACUUM ANALYZE email_events;

-- Check table size
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Scale Up Database
```bash
# If on Supabase, upgrade plan temporarily
# Or add read replicas for queries

# If self-hosted:
# - Increase connection pool size
# - Add more RAM
# - Enable connection pooling (PgBouncer)
```

## Prevention

### 1. Implement Backpressure
```typescript
const MAX_CONCURRENT_WEBHOOKS = 50;
let activeWebhooks = 0;

async function processWebhook(event: WebhookEvent) {
  if (activeWebhooks >= MAX_CONCURRENT_WEBHOOKS) {
    throw new Error('Too many concurrent webhooks');
  }

  activeWebhooks++;
  try {
    await processWebhookEvent(event);
  } finally {
    activeWebhooks--;
  }
}
```

### 2. Set Up Monitoring
```bash
# Alert thresholds
WEBHOOK_RATE_WARN=500/min
WEBHOOK_RATE_CRITICAL=1000/min
WEBHOOK_ERROR_RATE=5%

# Metrics to track
- webhook.received (counter)
- webhook.processed (counter)
- webhook.failed (counter)
- webhook.duration_ms (histogram)
- webhook.queue_depth (gauge)
```

### 3. Configure SNS Delivery Policy
```json
{
  "healthyRetryPolicy": {
    "minDelayTarget": 1,
    "maxDelayTarget": 20,
    "numRetries": 3,
    "numMaxDelayRetries": 0,
    "numNoDelayRetries": 0,
    "numMinDelayRetries": 0,
    "backoffFunction": "exponential"
  },
  "throttlePolicy": {
    "maxReceivesPerSecond": 100
  }
}
```

### 4. Implement Circuit Breaker
```typescript
const circuitBreaker = {
  failures: 0,
  threshold: 10,
  timeout: 60000, // 1 minute
  state: 'closed', // closed | open | half-open

  recordSuccess() {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
    }
  },

  recordFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'open';
      setTimeout(() => {
        this.state = 'half-open';
      }, this.timeout);
    }
  },

  canProcess() {
    return this.state !== 'open';
  },
};
```

## Debugging

### Check SNS Subscription
```bash
# List subscriptions
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-west-2:xxx:ses-events

# Check delivery attempts
aws sns get-subscription-attributes \
  --subscription-arn arn:aws:sns:...

# Look for:
# - ConfirmationWasAuthenticated: true
# - PendingConfirmation: false
# - DeliveryPolicy: {...}
```

### Test Webhook Manually
```bash
# Send test webhook
curl -X POST https://newsletter.crav.io/api/provider/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "Type": "Notification",
    "Message": "{\"eventType\":\"Delivery\",\"mail\":{\"messageId\":\"test-123\"}}"
  }'
```

## Escalation

If webhook storm continues:
1. **Pause SNS subscription** (temporary)
   ```bash
   aws sns set-subscription-attributes \
     --subscription-arn arn:aws:sns:... \
     --attribute-name RawMessageDelivery \
     --attribute-value false
   ```

2. **Buffer to SQS** (longer-term)
   - Create SQS queue
   - Subscribe queue to SNS
   - Process from queue asynchronously

3. **Contact AWS Support**
   - If SES is sending abnormal traffic
   - Request rate limit adjustment
