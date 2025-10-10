# CRAudioVizAI Newsletter - Enterprise Architecture Plan

## Status: 🏗️ IN PROGRESS

Hybrid approach: Keep existing Lite version, build enterprise version with Javari Dashboard integration.

---

## Architecture Overview

### Two Versions

| Feature | Lite (Current) | Enterprise (New) |
|---------|---------------|------------------|
| **Framework** | Vite + React | Next.js 14 App Router |
| **Backend** | Supabase Edge Functions | Next.js API + tRPC |
| **Database** | Supabase (direct) | Supabase via Prisma |
| **Auth** | Supabase Auth | Javari SSO + email/magic link fallback |
| **Billing** | Self-contained credits | Unified Credits ledger + Stripe/PayPal |
| **Deployment** | Standalone only | Standalone + Dashboard plugin |
| **Editor** | Basic textarea | Drag-drop block editor |
| **Features** | Core send/track | Enterprise (A/B, GDPR, workspaces, RBAC) |
| **Target** | Self-hosted, SMB | Multi-tenant SaaS, Enterprise |

---

## Project Structure

```
/project
├── apps/
│   ├── newsletter-lite/           # Existing standalone app (keep as-is)
│   │   ├── src/
│   │   ├── supabase/functions/
│   │   └── public/
│   │
│   └── newsletter-enterprise/     # New Next.js 14 app
│       ├── src/
│       │   ├── app/               # App Router
│       │   │   ├── (auth)/        # Auth routes
│       │   │   ├── (dashboard)/   # Main app routes
│       │   │   ├── api/           # API routes
│       │   │   └── layout.tsx
│       │   ├── components/        # UI components
│       │   │   ├── editor/        # Drag-drop editor
│       │   │   ├── blocks/        # Block library
│       │   │   ├── audience/      # Audience management
│       │   │   └── analytics/     # Analytics dashboards
│       │   ├── lib/
│       │   │   ├── auth/          # Dual auth system
│       │   │   ├── credits/       # Credits integration
│       │   │   ├── email/         # Email sending
│       │   │   └── analytics/     # Analytics tracking
│       │   ├── server/            # tRPC server
│       │   │   ├── routers/
│       │   │   └── context.ts
│       │   ├── workers/           # Background jobs
│       │   └── prisma/
│       │       ├── schema.prisma
│       │       └── migrations/
│       │
│       ├── public/
│       ├── .env.example
│       ├── next.config.js
│       └── package.json
│
├── packages/
│   ├── @crav/ui/                  # Shared design system
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── index.ts
│   │   ├── theme/
│   │   │   ├── colors.ts
│   │   │   ├── typography.ts
│   │   │   └── spacing.ts
│   │   └── package.json
│   │
│   ├── @crav/utils/               # Shared utilities
│   │   ├── date.ts
│   │   ├── string.ts
│   │   ├── validation.ts
│   │   └── package.json
│   │
│   └── @crav/analytics/           # Analytics SDK
│       ├── track.ts
│       ├── events.ts
│       └── package.json
│
├── docs/
│   ├── API.md                     # OpenAPI spec
│   ├── WEBHOOKS.md                # Webhook documentation
│   ├── MIGRATION.md               # Migration plan
│   └── ARCHITECTURE.md            # This file
│
└── package.json                   # Root workspace
```

---

## Tech Stack

### Frontend
- **Next.js 14** - App Router with React Server Components
- **TypeScript** - Strict mode
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **dnd-kit** - Drag-and-drop for editor
- **TipTap** - Rich text editor
- **Recharts** - Analytics charts
- **React Hook Form** - Form handling
- **Zod** - Schema validation

### Backend
- **Next.js API Routes** - REST endpoints
- **tRPC** - Type-safe RPC
- **Prisma** - ORM for Postgres
- **Supabase Postgres** - Database (existing)
- **BullMQ** - Job queue (Redis-backed)
- **Zod** - Request/response validation

### Auth
- **Javari SSO** - Primary (Dashboard users)
- **NextAuth.js** - Standalone mode (email + magic link)
- **JWT** - Session tokens
- **RBAC** - Role-based access control

### Billing
- **Stripe SDK** - Subscriptions + one-time
- **PayPal SDK** - Alternative payment
- **Credits Service** - Unified ledger integration
- **Webhooks** - Payment reconciliation

### Email Sending
- **AWS SES** - Primary provider
- **Postmark** - Fallback adapter
- **SendGrid** - Fallback adapter
- **Queue** - Background send processing

### Infrastructure
- **Vercel** - Hosting (Next.js optimized)
- **Supabase** - Postgres database
- **Redis** - Job queue + cache
- **S3/CDN** - Asset storage
- **Sentry** - Error tracking
- **PostHog** - Product analytics

---

## Database Schema (Prisma)

### Core Models

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ============================================================================
// AUTH & TENANCY
// ============================================================================

model Organization {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  plan        Plan     @default(FREE)
  stripeId    String?  @unique
  paypalId    String?  @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspaces  Workspace[]
  members     OrganizationMember[]
  credits     CreditTransaction[]
  auditLogs   AuditLog[]
}

model Workspace {
  id             String   @id @default(uuid())
  organizationId String
  name           String
  slug           String
  settings       Json     @default("{}")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  members        WorkspaceMember[]
  campaigns      Campaign[]
  templates      Template[]
  audiences      Audience[]
  brandKits      BrandKit[]

  @@unique([organizationId, slug])
  @@index([organizationId])
}

model User {
  id              String   @id @default(uuid())
  email           String   @unique
  name            String?
  avatar          String?
  emailVerified   DateTime?
  javariId        String?  @unique
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organizations   OrganizationMember[]
  workspaces      WorkspaceMember[]
  campaigns       Campaign[]
  auditLogs       AuditLog[]
}

model OrganizationMember {
  id             String   @id @default(uuid())
  organizationId String
  userId         String
  role           OrgRole  @default(VIEWER)
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
  @@index([userId])
}

model WorkspaceMember {
  id          String      @id @default(uuid())
  workspaceId String
  userId      String
  role        WorkspaceRole @default(VIEWER)
  createdAt   DateTime    @default(now())

  workspace   Workspace   @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
  @@index([userId])
}

enum Plan {
  FREE
  STARTER
  PRO
  ENTERPRISE
}

enum OrgRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

enum WorkspaceRole {
  ADMIN
  EDITOR
  VIEWER
}

// ============================================================================
// CAMPAIGNS & CONTENT
// ============================================================================

model Campaign {
  id              String         @id @default(uuid())
  workspaceId     String
  createdById     String
  name            String
  subject         String?
  preheader       String?
  fromName        String?
  fromEmail       String?
  replyTo         String?
  content         Json           @default("{}")
  status          CampaignStatus @default(DRAFT)
  scheduledAt     DateTime?
  sentAt          DateTime?
  audienceId      String?
  segmentRules    Json?
  settings        Json           @default("{}")
  abTestConfig    Json?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  workspace       Workspace      @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy       User           @relation(fields: [createdById], references: [id])
  audience        Audience?      @relation(fields: [audienceId], references: [id])
  sends           Send[]
  analytics       CampaignAnalytics?

  @@index([workspaceId])
  @@index([status])
  @@index([scheduledAt])
}

model Template {
  id          String   @id @default(uuid())
  workspaceId String
  name        String
  description String?
  thumbnail   String?
  content     Json     @default("{}")
  category    String?
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@index([category])
}

model BrandKit {
  id          String   @id @default(uuid())
  workspaceId String
  name        String
  colors      Json     @default("{}")
  typography  Json     @default("{}")
  logos       Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  SENDING
  SENT
  PAUSED
  FAILED
}

// ============================================================================
// AUDIENCE & CONTACTS
// ============================================================================

model Audience {
  id          String   @id @default(uuid())
  workspaceId String
  name        String
  description String?
  type        AudienceType @default(STATIC)
  rules       Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  contacts    AudienceContact[]
  campaigns   Campaign[]

  @@index([workspaceId])
}

model Contact {
  id              String   @id @default(uuid())
  workspaceId     String
  email           String
  firstName       String?
  lastName        String?
  customFields    Json     @default("{}")
  status          ContactStatus @default(PENDING)
  doubleOptInAt   DateTime?
  unsubscribedAt  DateTime?
  unsubscribeReason String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  audiences       AudienceContact[]
  sends           Send[]
  events          EmailEvent[]

  @@unique([workspaceId, email])
  @@index([email])
  @@index([status])
}

model AudienceContact {
  audienceId String
  contactId  String
  addedAt    DateTime @default(now())

  audience   Audience @relation(fields: [audienceId], references: [id], onDelete: Cascade)
  contact    Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@id([audienceId, contactId])
  @@index([contactId])
}

enum AudienceType {
  STATIC
  DYNAMIC
}

enum ContactStatus {
  PENDING
  SUBSCRIBED
  UNSUBSCRIBED
  BOUNCED
  COMPLAINED
}

// ============================================================================
// SENDING & TRACKING
// ============================================================================

model Send {
  id              String     @id @default(uuid())
  campaignId      String
  contactId       String
  status          SendStatus @default(QUEUED)
  provider        String?
  providerMessageId String?
  sentAt          DateTime?
  failureReason   String?
  createdAt       DateTime   @default(now())

  campaign        Campaign   @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  contact         Contact    @relation(fields: [contactId], references: [id], onDelete: Cascade)
  events          EmailEvent[]

  @@index([campaignId])
  @@index([contactId])
  @@index([status])
  @@index([providerMessageId])
}

model EmailEvent {
  id        String    @id @default(uuid())
  sendId    String
  contactId String
  type      EventType
  metadata  Json      @default("{}")
  createdAt DateTime  @default(now())

  send      Send      @relation(fields: [sendId], references: [id], onDelete: Cascade)
  contact   Contact   @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@index([sendId])
  @@index([contactId])
  @@index([type])
  @@index([createdAt])
}

enum SendStatus {
  QUEUED
  SENDING
  SENT
  DELIVERED
  BOUNCED
  FAILED
}

enum EventType {
  OPEN
  CLICK
  BOUNCE
  COMPLAINT
  UNSUBSCRIBE
}

// ============================================================================
// ANALYTICS
// ============================================================================

model CampaignAnalytics {
  id            String   @id @default(uuid())
  campaignId    String   @unique
  totalSent     Int      @default(0)
  totalDelivered Int     @default(0)
  totalOpens    Int      @default(0)
  uniqueOpens   Int      @default(0)
  totalClicks   Int      @default(0)
  uniqueClicks  Int      @default(0)
  totalBounces  Int      @default(0)
  totalComplaints Int    @default(0)
  totalUnsubscribes Int  @default(0)
  updatedAt     DateTime @updatedAt

  campaign      Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
}

// ============================================================================
// BILLING & CREDITS
// ============================================================================

model CreditTransaction {
  id             String   @id @default(uuid())
  organizationId String
  amount         Int
  type           CreditType
  reason         String
  metadata       Json     @default("{}")
  balanceAfter   Int
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([createdAt])
}

enum CreditType {
  PURCHASE
  DEDUCTION
  REFUND
  BONUS
}

// ============================================================================
// AUDIT & COMPLIANCE
// ============================================================================

model AuditLog {
  id             String   @id @default(uuid())
  organizationId String
  userId         String?
  action         String
  resource       String
  resourceId     String?
  metadata       Json     @default("{}")
  ipAddress      String?
  userAgent      String?
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User?        @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}

model SuppressionList {
  id          String   @id @default(uuid())
  email       String   @unique
  reason      String
  addedAt     DateTime @default(now())

  @@index([email])
}
```

---

## Shared Packages

### @crav/ui

Design system with Tailwind + Radix UI primitives:

```typescript
// packages/ui/components/Button.tsx
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ ... }) => { ... }

// packages/ui/theme/colors.ts
export const colors = {
  primary: { ... },
  secondary: { ... },
  neutral: { ... },
  error: { ... },
  success: { ... },
  warning: { ... },
};
```

### @crav/utils

Common utilities:

```typescript
// packages/utils/date.ts
export function formatDate(date: Date, format: string): string { ... }

// packages/utils/validation.ts
export const emailSchema = z.string().email();
export const urlSchema = z.string().url();
```

### @crav/analytics

Analytics SDK:

```typescript
// packages/analytics/track.ts
export function track(event: string, properties?: Record<string, any>): void { ... }
export function identify(userId: string, traits?: Record<string, any>): void { ... }
```

---

## Auth System

### Dual Mode Architecture

```typescript
// src/lib/auth/config.ts
export const authConfig = {
  mode: process.env.AUTH_MODE as 'sso' | 'standalone' | 'hybrid',
  sso: {
    issuer: process.env.CRAV_SSO_ISSUER,
    clientId: process.env.CRAV_SSO_CLIENT_ID,
    clientSecret: process.env.CRAV_SSO_CLIENT_SECRET,
  },
  standalone: {
    providers: ['email', 'magic-link'],
  },
};

// src/lib/auth/provider.ts
export async function authenticateRequest(req: Request) {
  const mode = authConfig.mode;

  if (mode === 'sso' || mode === 'hybrid') {
    const ssoSession = await validateSSOToken(req);
    if (ssoSession) return ssoSession;
  }

  if (mode === 'standalone' || mode === 'hybrid') {
    const standaloneSession = await validateStandaloneToken(req);
    if (standaloneSession) return standaloneSession;
  }

  return null;
}
```

### SSO Integration

```typescript
// src/lib/auth/sso.ts
export async function handleSSOCallback(code: string) {
  const tokens = await exchangeCodeForTokens(code);
  const user = await fetchJavariUser(tokens.access_token);

  // Sync user to local database
  const localUser = await prisma.user.upsert({
    where: { javariId: user.id },
    create: {
      javariId: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    },
    update: {
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    },
  });

  return createSession(localUser);
}
```

---

## Credits Integration

### Unified Ledger

```typescript
// src/lib/credits/service.ts
export class CreditsService {
  async deduct(
    organizationId: string,
    amount: number,
    reason: string,
    metadata?: any
  ) {
    // 1. Check balance
    const balance = await this.getBalance(organizationId);
    if (balance < amount) {
      throw new InsufficientCreditsError();
    }

    // 2. Deduct locally
    const transaction = await prisma.creditTransaction.create({
      data: {
        organizationId,
        amount: -amount,
        type: 'DEDUCTION',
        reason,
        metadata,
        balanceAfter: balance - amount,
      },
    });

    // 3. Sync to Dashboard Credits Service
    if (process.env.CREDITS_SERVICE_URL) {
      await fetch(`${process.env.CREDITS_SERVICE_URL}/deduct`, {
        method: 'POST',
        headers: { 'X-API-Key': process.env.CREDITS_SERVICE_KEY },
        body: JSON.stringify({
          organizationId,
          amount,
          reason,
          metadata: { transactionId: transaction.id },
        }),
      });
    }

    return transaction;
  }

  async getBalance(organizationId: string): Promise<number> {
    const latest = await prisma.creditTransaction.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return latest?.balanceAfter ?? 0;
  }
}
```

### Billing Webhooks

```typescript
// src/app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const event = stripe.webhooks.constructEvent(
    await req.text(),
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Add credits
    await creditsService.add(
      session.metadata.organizationId,
      session.metadata.credits,
      'PURCHASE',
      { stripeSessionId: session.id }
    );

    // Sync to Dashboard
    await syncToCreditsService(session);
  }

  return Response.json({ received: true });
}
```

---

## Performance Targets

### Frontend (p95)
- UI action ≤ 200ms
- Page load ≤ 1.5s
- TTI ≤ 2.5s
- CLS < 0.1

### Backend (p95)
- tRPC call ≤ 150ms
- Send queue enqueue ≤ 300ms
- Email send ≤ 5s
- Analytics query ≤ 500ms

### Strategies
- React Server Components for fast initial load
- Optimistic updates for UI responsiveness
- Background jobs for heavy operations
- Database indexes on hot paths
- Redis caching for frequent reads
- CDN for static assets

---

## Security Implementation

### RBAC

```typescript
// src/lib/rbac/permissions.ts
export const permissions = {
  'campaign:create': ['OWNER', 'ADMIN', 'EDITOR'],
  'campaign:read': ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'],
  'campaign:update': ['OWNER', 'ADMIN', 'EDITOR'],
  'campaign:delete': ['OWNER', 'ADMIN'],
  'campaign:send': ['OWNER', 'ADMIN'],
  // ... more permissions
};

export function can(role: WorkspaceRole, permission: string): boolean {
  return permissions[permission]?.includes(role) ?? false;
}

// src/server/middleware/authorize.ts
export function authorize(permission: string) {
  return async (ctx: Context) => {
    const { workspaceId } = ctx;
    const member = await getWorkspaceMember(ctx.userId, workspaceId);

    if (!can(member.role, permission)) {
      throw new ForbiddenError();
    }
  };
}
```

### Signed Webhooks

```typescript
// src/lib/webhooks/verify.ts
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expected = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Audit Logging

```typescript
// src/lib/audit/logger.ts
export async function logAction(
  organizationId: string,
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  metadata?: any
) {
  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action,
      resource,
      resourceId,
      metadata,
      ipAddress: getClientIP(),
      userAgent: getClientUserAgent(),
    },
  });
}
```

---

## Dashboard Integration

### Plugin Module

```typescript
// src/dashboard-plugin/index.ts
export const NewsletterPlugin = {
  id: 'newsletter',
  name: 'Newsletter',
  icon: 'Mail',
  routes: [
    {
      path: '/newsletter',
      component: () => import('./pages/CampaignsPage'),
    },
    {
      path: '/newsletter/new',
      component: () => import('./pages/NewCampaignPage'),
    },
    {
      path: '/newsletter/audiences',
      component: () => import('./pages/AudiencesPage'),
    },
  ],
  navigation: {
    label: 'Newsletter',
    icon: 'Mail',
    href: '/newsletter',
    badge: () => getDraftCount(),
  },
  featureFlags: ['newsletter_enabled'],
  permissions: ['newsletter:read'],
};

// Usage in Dashboard:
// import { NewsletterPlugin } from '@crav/newsletter/dashboard-plugin';
// registerPlugin(NewsletterPlugin);
```

---

## Migration Plan

### Phase 1: Foundation (Week 1-2)
- ✅ Set up Next.js 14 project structure
- ✅ Create shared packages (@crav/ui, @crav/utils, @crav/analytics)
- ✅ Set up Prisma with Supabase Postgres
- ✅ Implement dual auth system
- ✅ Set up tRPC endpoints

### Phase 2: Core Features (Week 3-4)
- Drag-drop editor with block library
- Campaign management (CRUD)
- Audience management with segments
- Template system with brand kits

### Phase 3: Sending & Tracking (Week 5)
- Email sending via provider layer
- Background job queue
- Open/click tracking
- Deliverability tools

### Phase 4: Advanced Features (Week 6-7)
- A/B testing
- Scheduled/recurring sends
- Smart send time
- Analytics dashboards

### Phase 5: Enterprise Features (Week 8)
- RBAC implementation
- Workspace multi-tenancy
- GDPR/CCPA compliance tools
- Audit logging

### Phase 6: Integration & Polish (Week 9-10)
- Dashboard plugin module
- Credits/billing integration
- API documentation
- Migration scripts

---

## Deliverables Checklist

- [ ] Next.js 14 app with App Router
- [ ] Prisma schema + migrations
- [ ] Shared packages (@crav/ui, @crav/utils, @crav/analytics)
- [ ] Dual auth (SSO + standalone)
- [ ] RBAC + workspace scoping
- [ ] Drag-drop editor
- [ ] Campaign management
- [ ] Audience management
- [ ] Email sending (SES + adapters)
- [ ] Tracking (open/click/bounce)
- [ ] A/B testing
- [ ] Scheduled sends
- [ ] Analytics dashboard
- [ ] Credits integration
- [ ] Stripe + PayPal checkout
- [ ] GDPR tools
- [ ] API endpoints + OpenAPI spec
- [ ] Webhook handlers + docs
- [ ] Dashboard plugin module
- [ ] README + .env.example
- [ ] Seed data
- [ ] Migration scripts
- [ ] CI pipeline (tests + lint + typecheck)

---

## Next Steps

1. Set up Next.js 14 project structure
2. Create shared packages structure
3. Initialize Prisma with schema
4. Implement auth system foundation
5. Build basic UI with @crav/ui components

Ready to proceed with implementation?
