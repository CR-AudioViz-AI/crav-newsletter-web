# Newsletter Pro - Production Readiness Checklist

## Current Status: MVP Complete (Dev Mode)

The MVP is fully functional in development mode with:
- ✅ All three core UI pages (Lists, Templates, Campaigns)
- ✅ CSV import, template editor, campaign scheduling
- ✅ DevEmail provider (writes to /tmp/emails/)
- ✅ Mock credits API (unlimited credits)
- ✅ Dev JWT generation (no real auth)
- ✅ RLS disabled for dev convenience
- ✅ Build passes, all features working

## Production Deployment Roadmap

### Phase 1: Critical Security & Infrastructure (BLOCKER)

**Priority: P0 - Must complete before ANY production deployment**

- [ ] **Remove Dev Mode Endpoints**
  - Delete `/auth/dev-token` route
  - Delete `/auth/debug` route
  - Delete `/.well-known/jwks.json` (dev JWKS)
  - Set `APP_MODE=prod` in environment

- [ ] **Enable Production RLS Policies**
  - Revert `sql/dev_rls_permissive.sql` (re-enable RLS)
  - Deploy `sql/prod_rls_policies.sql` with proper org/workspace scoping
  - Test cross-workspace access denial
  - Verify Events/Sends are append-only for non-admins

- [ ] **Real Authentication Integration**
  - Wire up SSO JWT verification (CRAV_SSO_JWKS_URL)
  - Enforce session validation on all routes
  - Add RBAC checks: admin, editor, viewer roles
  - Remove all dev auth bypasses

- [ ] **Webhook Security**
  - Add SNS/SES signature verification on `/api/provider/webhook`
  - Implement idempotency using `idempotency_keys` table
  - Add retry logic with exponential backoff
  - Set up DLQ for failed webhook processing

- [ ] **Credits API Integration**
  - Replace mock with real API calls
  - Implement authorize → commit/revert flow
  - Surface credit errors in UI (insufficient balance, etc.)
  - Add retry logic for transient failures

---

### Phase 2: SES Email Provider (BLOCKER)

**Priority: P0 - Required for sending real emails**

- [ ] **SES Adapter Implementation**
  - Create `src/lib/email/ses-provider.ts`
  - Implement send via AWS SDK v3
  - Add configuration event handling
  - Wire webhook URL to SNS subscriptions

- [ ] **DNS Configuration**
  - Set up DKIM records in Route53/DNS provider
  - Configure SPF records
  - Configure DMARC policy
  - Verify domain in SES console
  - Move out of SES sandbox (if applicable)

- [ ] **Webhook Endpoint**
  - Deploy `/api/provider/webhook` to staging
  - Subscribe to SNS topics (Delivery, Bounce, Complaint, Open, Click)
  - Test with SES test emails
  - Verify events flow to `email_events` table

---

### Phase 3: Observability & Monitoring (HIGH PRIORITY)

**Priority: P1 - Should have before production**

- [ ] **Structured Logging**
  - Replace `console.log` with Winston/Pino
  - Add request IDs to all logs
  - Filter PII (emails, names) from logs
  - Log levels: error, warn, info, debug
  - Include context: orgId, campaignId, userId

- [ ] **Metrics & Alerting**
  - Add Prometheus/CloudWatch metrics
  - Track: emails_sent, emails_delivered, emails_bounced
  - Track: webhook_received, webhook_failed
  - Track: credits_authorized, credits_committed
  - Alert on: bounce_rate > 5%, webhook_5xx_rate > 1%

- [ ] **Health Checks**
  - Enhance `/api/health` with DB connectivity check
  - Add SES connectivity check
  - Add Credits API connectivity check
  - Add Supabase connectivity check
  - Return 503 if any dependency is down

- [ ] **Rate Limiting**
  - Implement token bucket rate limiter
  - Limits:
    - Login: 5 attempts / 15 min per IP
    - Schedule campaign: 10 / hour per org
    - Webhook ingest: 1000 / min globally
  - Use Redis or in-memory cache

---

### Phase 4: CI/CD Pipeline (HIGH PRIORITY)

**Priority: P1 - Required for safe deployments**

- [ ] **GitHub Actions / GitLab CI**
  - Lint: ESLint on all TypeScript files
  - Typecheck: `tsc --noEmit`
  - Build: `npm run build`
  - Unit tests: Jest/Vitest (if applicable)
  - E2E test: Playwright test (seed → import → schedule → verify)
  - Accessibility: axe-core on template editor & campaign pages

- [ ] **Deployment Stages**
  - On `main` branch push → deploy to staging
  - Manual approval gate → promote to production
  - Rollback capability (revert to previous tag)
  - Database migrations run before app deploy

- [ ] **Environment Management**
  - `.env.staging` with staging Supabase URL
  - `.env.prod.example` template for production
  - Secret management via GitHub Secrets / AWS Secrets Manager
  - No secrets in git repo

---

### Phase 5: Staging Validation (ACCEPTANCE CRITERIA)

**Priority: P0 - Gate for production**

**DNS & Deliverability:**
- [ ] DKIM verified (green check in SES console)
- [ ] SPF record published and validated
- [ ] DMARC policy published (p=quarantine or p=reject)
- [ ] Domain moved out of SES sandbox
- [ ] Test email to Gmail/Outlook/Yahoo delivers to inbox

**Functional Tests:**
- [ ] Send campaign to 10 test recipients
- [ ] All 10 emails delivered (check SES metrics)
- [ ] Events ingested correctly (delivered, open, click)
- [ ] Credits authorized before send
- [ ] Credits committed after send completes
- [ ] Bounce/complaint events trigger unsubscribes

**Security Tests:**
- [ ] Cross-workspace access rejected (different orgId)
- [ ] Non-admin cannot delete campaigns
- [ ] Webhook replay produces no duplicates (idempotency)
- [ ] Invalid webhook signature rejected
- [ ] Rate limits enforced (test with script)

**Operational Readiness:**
- [ ] CI/CD pipeline green
- [ ] E2E test passes in staging
- [ ] Logs visible in CloudWatch/Datadog
- [ ] Metrics visible in Grafana/CloudWatch
- [ ] Automated backups enabled on Supabase
- [ ] Runbooks committed to repo

---

## Quick Reference: Production Checklist

### Before Staging Deploy
- ✅ MVP complete (all done)
- [ ] RLS policies written and tested
- [ ] SES adapter implemented
- [ ] Real Credits API wired
- [ ] Webhook security implemented
- [ ] Dev endpoints removed
- [ ] Structured logging added
- [ ] Rate limiting implemented
- [ ] CI/CD pipeline created

### Before Production Deploy
- [ ] Staging acceptance tests passed
- [ ] DNS (DKIM/SPF/DMARC) verified
- [ ] Load test completed (1000 sends/min)
- [ ] Security audit completed
- [ ] Incident response runbook written
- [ ] On-call schedule established
- [ ] Rollback plan documented

---

## Deployment Commands

### Staging Deploy
```bash
# 1. Deploy database migrations
npm run migrate:staging

# 2. Build and deploy app
npm run build
npm run deploy:staging

# 3. Verify health
curl https://newsletter-staging.crav.io/api/health

# 4. Run smoke test
npm run test:e2e:staging
```

### Production Deploy
```bash
# 1. Tag release
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0

# 2. Manual approval in GitHub Actions UI

# 3. Monitor deployment
npm run deploy:monitor

# 4. Verify health & metrics
curl https://newsletter.crav.io/api/health
```

---

## Rollback Procedure

If issues detected in production:

```bash
# 1. Immediately revert to previous tag
git revert <commit-hash>
git push origin main

# 2. Or rollback infrastructure
npm run deploy:rollback v0.9.9

# 3. Verify rollback successful
curl https://newsletter.crav.io/api/health

# 4. Post-mortem
# Document what happened in /docs/postmortems/YYYY-MM-DD.md
```

---

## Next Steps

**To move from MVP to Staging:**
1. Start with Phase 1 (Critical Security)
2. Implement Phase 2 (SES Provider)
3. Add Phase 3 (Observability)
4. Set up Phase 4 (CI/CD)
5. Complete Phase 5 (Staging Validation)

**Estimated Timeline:**
- Phase 1: 2-3 days
- Phase 2: 2-3 days
- Phase 3: 1-2 days
- Phase 4: 1-2 days
- Phase 5: 1 day testing
- **Total: 7-11 days** to production-ready

**What to prioritize first:**
1. RLS policies (security blocker)
2. Remove dev endpoints (security blocker)
3. SES adapter (functional blocker)
4. Webhook security (security blocker)
5. Everything else can be done in parallel
