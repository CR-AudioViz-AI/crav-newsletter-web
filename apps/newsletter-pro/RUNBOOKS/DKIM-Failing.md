# Runbook: DKIM Verification Failing

## DNS Records Required

### SPF Record
```
Type: TXT
Name: @
Value: v=spf1 include:amazonses.com ~all
TTL: 3600
```

### DKIM Records (3 records from SES console)
```
Type: CNAME
Name: abc123._domainkey
Value: abc123.dkim.amazonses.com
TTL: 3600

Type: CNAME
Name: def456._domainkey
Value: def456.dkim.amazonses.com
TTL: 3600

Type: CNAME
Name: ghi789._domainkey
Value: ghi789.dkim.amazonses.com
TTL: 3600
```

### DMARC Record
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@crav.io
TTL: 3600
```

### MAIL FROM Domain (Custom)
```
Type: MX
Name: bounce.newsletter.crav.io
Value: 10 feedback-smtp.us-west-2.amazonses.com
TTL: 3600

Type: TXT
Name: bounce.newsletter.crav.io
Value: v=spf1 include:amazonses.com ~all
TTL: 3600
```

## Verification Steps

```bash
# 1. Check DNS propagation
dig TXT _dmarc.crav.io
dig CNAME abc123._domainkey.crav.io

# 2. Verify in SES console
aws ses get-identity-dkim-attributes \
  --identities crav.io \
  --region us-west-2

# 3. Check domain verification
aws ses get-identity-verification-attributes \
  --identities crav.io \
  --region us-west-2

# Expected output:
# VerificationStatus: Success
# DkimEnabled: true
# DkimVerificationStatus: Success
```

## Common Issues

### Issue 1: DNS Not Propagated (wait 24-48h)
### Issue 2: Wrong CNAME values (copy from SES console exactly)
### Issue 3: TTL too high (reduce to 300 for testing)

## Testing
```bash
# Send test email
aws ses send-email \
  --from "test@crav.io" \
  --destination "ToAddresses=test@gmail.com" \
  --message "Subject={Data=Test},Body={Text={Data=Test}}" \
  --region us-west-2

# Check headers in received email for DKIM signature
```
