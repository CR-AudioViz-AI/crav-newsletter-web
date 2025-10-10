# CRAudioVizAI Shared Packages - Complete

## Status: ✅ COMPLETE

Three shared packages created for use across all CRAudioVizAI applications.

---

## Package Overview

### Structure

```
/project/packages/
├── @crav/ui/              # Design system components
├── @crav/utils/           # Common utilities
└── @crav/analytics/       # Analytics SDK
```

---

## @crav/ui - Design System

### Purpose
Unified design system with accessible, reusable components built on Radix UI primitives and Tailwind CSS.

### Components

#### Button
```typescript
import { Button } from '@crav/ui';

<Button variant="primary" size="md" loading={false}>
  Click me
</Button>

// Variants: primary, secondary, outline, ghost, danger
// Sizes: sm, md, lg
```

#### Input
```typescript
import { Input } from '@crav/ui';

<Input
  label="Email"
  error="Invalid email"
  helperText="We'll never share your email"
  placeholder="you@example.com"
/>
```

#### Card
```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@crav/ui';

<Card>
  <CardHeader>
    <CardTitle>Campaign Analytics</CardTitle>
    <CardDescription>Last 30 days</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

### Theme Tokens

#### Colors
```typescript
import { colors } from '@crav/ui';

// Available scales: primary, secondary, neutral, success, warning, error
// Each with 50-950 shades
colors.primary[600]  // #2563eb
colors.neutral[900]  // #171717
```

#### Typography
```typescript
import { typography } from '@crav/ui';

// Font families: sans, mono
typography.fontFamily.sans  // ['Inter', ...]

// Font sizes: xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl
typography.fontSize.base  // ['1rem', { lineHeight: '1.5rem' }]

// Font weights: normal, medium, semibold, bold
typography.fontWeight.semibold  // '600'
```

#### Spacing
```typescript
import { spacing, borderRadius } from '@crav/ui';

spacing[4]  // '1rem'
borderRadius.lg  // '0.5rem'
```

### Utilities

#### cn() - Class Name Merger
```typescript
import { cn } from '@crav/ui';

const buttonClass = cn(
  'base-styles',
  isActive && 'active-styles',
  className
);
// Intelligently merges Tailwind classes, resolving conflicts
```

### Dependencies
- React 18.3+
- Radix UI primitives (accessible components)
- class-variance-authority (variant system)
- clsx + tailwind-merge (class merging)
- lucide-react (icons)

---

## @crav/utils - Common Utilities

### Purpose
Shared utility functions for date formatting, string manipulation, and validation.

### Date Utilities

```typescript
import { formatDate, formatRelativeDate, isToday, addDays } from '@crav/utils';

formatDate(new Date(), 'short')      // "Jan 15, 2025"
formatDate(new Date(), 'long')       // "January 15, 2025 at 3:30 PM"
formatDate(new Date(), 'relative')   // "2h ago"

formatRelativeDate(someDate)         // "3d ago", "2w ago", "1mo ago"

isToday(new Date())                  // true
isYesterday(new Date('2025-01-14'))  // true (if today is Jan 15)

addDays(new Date(), 7)               // Date 7 days from now
startOfDay(new Date())               // Today at 00:00:00
endOfDay(new Date())                 // Today at 23:59:59
```

### String Utilities

```typescript
import { truncate, slugify, capitalize, titleCase, initials, formatBytes, mask } from '@crav/utils';

truncate('Long text here', 10)           // "Long te..."
slugify('Hello World!')                  // "hello-world"
capitalize('hello')                      // "Hello"
titleCase('hello world')                 // "Hello World"
initials('John Doe')                     // "JD"
formatBytes(1536)                        // "1.5 KB"
formatBytes(1048576)                     // "1 MB"
mask('1234567890', 4)                    // "******7890"
generateId('campaign')                   // "campaign_a3f2k9s"
```

### Validation Utilities

```typescript
import {
  emailSchema,
  urlSchema,
  phoneSchema,
  passwordSchema,
  isEmail,
  isUrl,
  sanitizeHtml
} from '@crav/utils';

// Zod schemas for form validation
emailSchema.parse('user@example.com')       // ✓ Passes
passwordSchema.parse('weak')                // ✗ Throws error

// Quick boolean checks
isEmail('user@example.com')                 // true
isUrl('https://example.com')                // true
isPhone('+14155552671')                     // true
isSlug('my-post-slug')                      // true
isUuid('550e8400-e29b-41d4-a716-446655440000')  // true
isStrongPassword('MyP@ssw0rd')              // true

// XSS protection
sanitizeHtml('<script>alert("XSS")</script><p>Safe</p>')
// Returns: '<p>Safe</p>'
```

### Dependencies
- Zod (schema validation)

---

## @crav/analytics - Analytics SDK

### Purpose
Unified event tracking across all CRAudioVizAI applications with automatic batching and offline support.

### Usage

#### Initialize
```typescript
import { init, identify, track, page } from '@crav/analytics';

// In your app initialization
init({
  apiUrl: 'https://analytics.example.com/events',
  apiKey: 'your-api-key',
  debug: process.env.NODE_ENV === 'development'
});
```

#### Identify Users
```typescript
import { identify } from '@crav/analytics';

identify('user-123', {
  email: 'user@example.com',
  name: 'John Doe',
  plan: 'pro'
});
```

#### Track Events
```typescript
import { track, NewsletterEvents } from '@crav/analytics';

track(NewsletterEvents.CAMPAIGN_SENT, {
  campaign_id: 'abc123',
  recipient_count: 1500,
  segment: 'premium-users'
});
```

#### Page Views
```typescript
import { page } from '@crav/analytics';

page('Campaign Editor', {
  campaign_id: 'abc123',
  status: 'draft'
});
```

### Event Catalog

#### Newsletter Events
```typescript
import { NewsletterEvents } from '@crav/analytics';

NewsletterEvents.CAMPAIGN_CREATED
NewsletterEvents.CAMPAIGN_SENT
NewsletterEvents.DRAFT_GENERATED
NewsletterEvents.BLOCK_REWRITTEN
NewsletterEvents.SEGMENT_SUGGESTED
NewsletterEvents.CONTACT_UNSUBSCRIBED
NewsletterEvents.EMAIL_OPENED
NewsletterEvents.EMAIL_CLICKED
// ... and more
```

#### Auth Events
```typescript
import { AuthEvents } from '@crav/analytics';

AuthEvents.USER_SIGNED_IN
AuthEvents.USER_SIGNED_UP
AuthEvents.PASSWORD_RESET_REQUESTED
```

#### Billing Events
```typescript
import { BillingEvents } from '@crav/analytics';

BillingEvents.CREDITS_PURCHASED
BillingEvents.CREDITS_DEDUCTED
BillingEvents.SUBSCRIPTION_CREATED
BillingEvents.PAYMENT_SUCCEEDED
```

#### Workspace Events
```typescript
import { WorkspaceEvents } from '@crav/analytics';

WorkspaceEvents.WORKSPACE_CREATED
WorkspaceEvents.MEMBER_INVITED
WorkspaceEvents.ROLE_CHANGED
```

### Features
- Automatic anonymous ID generation (stored in localStorage)
- User identification with traits
- Event properties for rich context
- Page view tracking
- Debug mode for development
- Graceful degradation (continues if API unreachable)

---

## Integration Examples

### In Next.js App

```typescript
// app/layout.tsx
import { init } from '@crav/analytics';

init({
  apiUrl: process.env.NEXT_PUBLIC_ANALYTICS_URL,
  apiKey: process.env.NEXT_PUBLIC_ANALYTICS_KEY,
  debug: process.env.NODE_ENV === 'development'
});

// app/components/CampaignCard.tsx
import { Button, Card, CardHeader, CardTitle, CardContent } from '@crav/ui';
import { formatDate, truncate } from '@crav/utils';
import { track, NewsletterEvents } from '@crav/analytics';

function CampaignCard({ campaign }) {
  const handleSend = () => {
    track(NewsletterEvents.CAMPAIGN_SENT, {
      campaign_id: campaign.id,
      recipient_count: campaign.recipients.length
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{truncate(campaign.name, 40)}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{formatDate(campaign.createdAt, 'relative')}</p>
        <Button onClick={handleSend}>Send Campaign</Button>
      </CardContent>
    </Card>
  );
}
```

### In React Component

```typescript
import { Input, Button } from '@crav/ui';
import { isEmail } from '@crav/utils';
import { track, AuthEvents } from '@crav/analytics';
import { useState } from 'react';

function SignInForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEmail(email)) {
      setError('Invalid email address');
      return;
    }

    await signIn(email);
    track(AuthEvents.USER_SIGNED_IN, { method: 'email' });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
      />
      <Button type="submit">Sign In</Button>
    </form>
  );
}
```

---

## Installation

### As Workspace Packages (Monorepo)

```json
// package.json (root)
{
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}

// apps/newsletter-enterprise/package.json
{
  "dependencies": {
    "@crav/ui": "workspace:*",
    "@crav/utils": "workspace:*",
    "@crav/analytics": "workspace:*"
  }
}
```

### Build Packages

```bash
# Build all packages
cd packages/ui && npm run build
cd packages/utils && npm run build
cd packages/analytics && npm run build

# Or use Turborepo for parallel builds
npx turbo run build --filter='@crav/*'
```

---

## Benefits

### 1. Zero Duplication
All apps share the same components, utilities, and analytics tracking - no duplicate code.

### 2. Consistent UX
Users experience the same look, feel, and behavior across Newsletter, Website Builder, App Builder, and Dashboard.

### 3. Type Safety
Full TypeScript support with generated types for autocomplete and type checking.

### 4. Accessibility
Radix UI primitives ensure WCAG 2.1 AA compliance out of the box.

### 5. Dark Mode Ready
All components support dark mode via Tailwind's dark: variants.

### 6. Tree-Shakeable
Only the components and utilities you import are included in your bundle.

### 7. Easy Updates
Fix a bug or add a feature in one place, and all apps benefit immediately.

---

## Development Workflow

### Watch Mode
```bash
# Terminal 1: Watch @crav/ui
cd packages/ui && npm run dev

# Terminal 2: Watch @crav/utils
cd packages/utils && npm run dev

# Terminal 3: Watch @crav/analytics
cd packages/analytics && npm run dev

# Terminal 4: Run Next.js app
cd apps/newsletter-enterprise && npm run dev
```

### Hot Reload
Changes to shared packages automatically reload in consuming apps (with proper bundler config).

---

## Testing

### Unit Tests (Recommended)
```bash
# Add vitest to each package
npm install -D vitest @vitest/ui

# packages/utils/__tests__/date.test.ts
import { describe, it, expect } from 'vitest';
import { formatRelativeDate } from '../date';

describe('formatRelativeDate', () => {
  it('formats recent dates', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(formatRelativeDate(twoHoursAgo)).toBe('2h ago');
  });
});
```

---

## Publishing (Future)

When ready to publish to npm:

```bash
# Authenticate
npm login

# Publish (from each package directory)
cd packages/ui && npm publish --access public
cd packages/utils && npm publish --access public
cd packages/analytics && npm publish --access public

# Or use changeset for versioning + changelog
npx changeset
npx changeset version
npx changeset publish
```

---

## Summary

✅ **3 shared packages created**
✅ **@crav/ui** - 3 components (Button, Input, Card) + theme tokens + utilities
✅ **@crav/utils** - Date, string, validation utilities
✅ **@crav/analytics** - Event tracking SDK with 40+ predefined events
✅ **Full TypeScript support** with type definitions
✅ **Zero duplication** across all apps
✅ **Accessible** (Radix UI primitives)
✅ **Dark mode ready**
✅ **Tree-shakeable** (only import what you need)

**Ready to use in Newsletter Enterprise, Website Builder, App Builder, and Dashboard.**
