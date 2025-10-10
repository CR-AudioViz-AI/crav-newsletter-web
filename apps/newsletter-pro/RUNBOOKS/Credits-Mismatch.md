# Runbook: Credits Ledger Mismatch

## Symptoms
- Credits not deducted after campaign send
- Authorization succeeded but commit failed
- Credit balance incorrect in dashboard

## Diagnosis

```sql
-- Check ledger for organization
SELECT *
FROM credit_ledger
WHERE org_id = 'org-id-here'
ORDER BY created_at DESC
LIMIT 50;

-- Find orphaned authorizations (no commit/revert)
SELECT authorization_id, amount, created_at
FROM credit_ledger
WHERE status = 'authorized'
AND created_at < now() - interval '1 hour';

-- Check campaign credit status
SELECT
  c.id,
  c.title,
  c.status,
  COUNT(s.id) as sends_count,
  SUM(CASE WHEN s.status = 'sent' THEN 1 ELSE 0 END) as sent_count
FROM campaigns c
LEFT JOIN sends s ON s.campaign_id = c.id
WHERE c.id = 'campaign-id-here'
GROUP BY c.id, c.title, c.status;
```

## Recovery

### Manually Commit Orphaned Authorizations
```bash
# Get authorization ID from ledger
AUTH_ID="auth-abc123"

# Call commit endpoint
curl -X POST https://credits-api.crav.io/credits/commit \
  -H "X-API-Key: $CREDITS_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"authorization_id\": \"$AUTH_ID\",
    \"amount_used\": 100
  }"
```

### Revert Failed Campaigns
```bash
# If campaign failed after authorization
curl -X POST https://credits-api.crav.io/credits/revert \
  -H "X-API-Key: $CREDITS_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"authorization_id\": \"$AUTH_ID\",
    \"reason\": \"Campaign send failed\"
  }"
```

### Reconciliation Query
```sql
-- Compare credits used vs actual sends
SELECT
  org_id,
  SUM(CASE WHEN status = 'committed' THEN amount ELSE 0 END) as credits_committed,
  (SELECT COUNT(*) FROM sends WHERE org_id = credit_ledger.org_id AND status = 'sent') as actual_sends,
  SUM(CASE WHEN status = 'committed' THEN amount ELSE 0 END) -
    (SELECT COUNT(*) FROM sends WHERE org_id = credit_ledger.org_id AND status = 'sent') as difference
FROM credit_ledger
GROUP BY org_id
HAVING ABS(difference) > 10;
```

## Prevention

1. **Add commit timeout**: Auto-commit after 10 minutes
2. **Implement idempotency**: Use campaign_id as idempotency key
3. **Add reconciliation job**: Nightly check for mismatches
4. **Monitor commit failures**: Alert if > 1% commit failure rate
