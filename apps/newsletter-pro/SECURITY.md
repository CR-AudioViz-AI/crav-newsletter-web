# Newsletter Pro - Security Policy

## PII (Personally Identifiable Information) Policy

### What is Considered PII
- Email addresses
- Full names (first_name, last_name, name)
- Phone numbers
- Physical addresses
- IP addresses (in some jurisdictions)
- Any custom subscriber fields containing personal data

### PII Handling Rules

**Storage:**
- All PII encrypted at rest in Supabase
- Database connections use TLS 1.2+
- Backups are encrypted

**Transmission:**
- All API calls use HTTPS only
- No PII in URL parameters
- No PII in query strings

**Logging:**
- PII is automatically redacted from logs
- Implemented in `src/lib/logger.ts`
- Fields like `email`, `name`, `phone` → `[REDACTED]`

**Access:**
- RLS policies restrict access to org-scoped data
- Role-based access control (Owner/Admin/Editor/Viewer)
- Audit logs track all PII access

## Logging Redaction

### Automatic Redaction
```typescript
// Before logging
{ email: "user@example.com", name: "John Doe", campaign_id: "abc" }

// After redaction
{ email: "[REDACTED]", name: "[REDACTED]", campaign_id: "abc" }
```

### Implementation
See `src/lib/logger.ts`:
```typescript
const piiFields = ['email', 'name', 'first_name', 'last_name', 'phone', 'address'];

function redactPII(obj: any): any {
  // Recursively redacts PII fields
}
```

### What CAN Be Logged
- Request IDs
- Organization IDs
- Campaign IDs
- Send IDs
- Timestamps
- Status codes
- Durations
- Error messages (without PII)

### What CANNOT Be Logged
- Email addresses
- Names
- Phone numbers
- Custom subscriber fields
- Email content
- Credentials/API keys

## Authentication & Authorization

### JWT Requirements
- Algorithm: RS256 (RSA with SHA-256)
- Issuer: `https://sso.crav.io`
- Audience: `crav.newsletter`
- Expiration: 1 hour max
- Refresh tokens: 7 days

### Required JWT Claims
```json
{
  "sub": "user-uuid",
  "email": "user@crav.io",
  "org_id": "org-uuid",
  "workspace_id": "workspace-uuid",
  "role": "admin",
  "iss": "https://sso.crav.io",
  "aud": "crav.newsletter",
  "exp": 1234567890
}
```

### Role Hierarchy
1. **Owner** - Full access, can manage billing and users
2. **Admin** - Can manage DNS/DKIM, delete resources
3. **Editor** - Can create/edit campaigns and templates
4. **Viewer** - Read-only access

## RLS (Row Level Security) Policies

### Deny-by-Default
All tables have RLS enabled with no default access. Access must be explicitly granted via policies.

### Org-Scoped Access
All policies check `auth.user_org_id() = table.org_id`

### Example Policy
```sql
CREATE POLICY "Users can view own org campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (org_id = auth.user_org_id());
```

### Append-Only Tables
- `sends` - Cannot be updated/deleted by non-admins
- `email_events` - Cannot be updated/deleted
- `unsubscribes` - Cannot be deleted (compliance)

## API Security

### Webhook Signature Verification
All webhooks from SES/SNS must include valid signatures.

Implemented in `src/lib/email/ses-provider.ts`:
```typescript
export async function verifySESWebhookSignature(
  message: string,
  signature: string,
  signingCertURL: string
): Promise<boolean>
```

### Rate Limiting
Implemented using token bucket algorithm:
- **Login**: 5 attempts per 15 minutes per IP
- **Schedule**: 10 campaigns per hour per org
- **Webhook**: 1000 per minute globally

### Idempotency
All webhooks are deduplicated using `idempotency_keys` table.

```sql
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);
```

## Data Retention

### Active Data
- **Subscribers**: Retained until deleted by user
- **Campaigns**: Retained indefinitely
- **Email Events**: Retained 2 years
- **Sends**: Retained 2 years

### Soft-Deleted Data
- Retention: 90 days
- Then permanently deleted via scheduled job

### Logs
- **Application Logs**: 90 days
- **Audit Logs**: 1 year
- **Metrics**: 13 months (Prometheus default)

### Backups
- **Production**: 30 days
- **Staging**: 7 days

## Compliance

### GDPR
**Right to Access:**
- Users can export all their data via UI
- API endpoint: `GET /api/users/{id}/export`

**Right to Deletion:**
- Users can delete account via UI
- API endpoint: `DELETE /api/users/{id}`
- Hard delete after 90-day grace period

**Data Portability:**
- Export format: JSON
- Includes: subscribers, campaigns, events

### CAN-SPAM
- Unsubscribe link in all emails
- Honored within 10 business days
- Physical address in footer
- Accurate "From" information

### SOC 2
- Access logs retained 1 year
- Change logs for all RLS policy updates
- Quarterly security audits
- Penetration testing annually

## Incident Response

### Security Incidents
1. **Detect**: Monitoring alerts on anomalous behavior
2. **Contain**: Isolate affected systems
3. **Investigate**: Analyze logs and audit trail
4. **Remediate**: Patch vulnerabilities
5. **Report**: Notify affected users within 72h (GDPR)

### Breach Notification
- **Internal**: Immediately notify security team
- **Users**: Within 72 hours if PII exposed
- **Regulators**: As required by jurisdiction

### Contact
- **Security Team**: security@crav.io
- **PGP Key**: Available at https://crav.io/security.txt
- **Bug Bounty**: https://crav.io/security/bug-bounty

## Vulnerability Disclosure

### Responsible Disclosure
If you find a security vulnerability:
1. Email security@crav.io with details
2. Do NOT disclose publicly until patched
3. Allow 90 days for remediation
4. Receive credit on our security page

### Scope
**In Scope:**
- SQL injection
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- Authentication bypass
- Authorization bypass
- PII exposure

**Out of Scope:**
- DDoS attacks
- Social engineering
- Physical attacks
- Third-party services (AWS, Supabase)

### Rewards
- **Critical**: $500-$2000
- **High**: $200-$500
- **Medium**: $50-$200
- **Low**: Recognition only

## Secure Development

### Code Review
- All PRs require 1 approval
- Security-sensitive changes require 2 approvals
- Automated security scanning via Snyk/Dependabot

### Dependency Management
- Automated updates for security patches
- Review all dependency changes
- Pin versions in production

### Secrets Management
- No secrets in code or git
- Use environment variables
- Rotate every 90 days
- Use AWS Secrets Manager or equivalent

## Encryption

### At Rest
- Database: AES-256 via Supabase
- Backups: Encrypted via Supabase
- Logs: Encrypted via CloudWatch

### In Transit
- TLS 1.2+ for all connections
- HTTPS only (HSTS enabled)
- Certificate pinning for mobile apps

### Key Management
- KMS for encryption keys
- Keys rotated annually
- Separate keys per environment

## Access Control

### Production Access
- Limited to on-call engineers
- Requires MFA
- All access logged
- Sessions expire after 4 hours

### Database Access
- No direct production DB access
- Use read replicas for queries
- Service account only for app

### SSH Keys
- RSA 4096 or Ed25519
- Rotated every 6 months
- No shared keys

## Security Checklist

Before deploying to production:
- [ ] RLS policies enabled on all tables
- [ ] Webhook signature verification enabled
- [ ] Rate limiting configured
- [ ] PII redaction in logs verified
- [ ] JWT validation configured
- [ ] RBAC enforced on all routes
- [ ] Secrets in environment variables
- [ ] TLS 1.2+ enforced
- [ ] Security headers configured
- [ ] Dependency audit passed
- [ ] Penetration test completed

## Security Headers

```nginx
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Last Updated
2025-10-10

## Questions?
Contact security@crav.io
