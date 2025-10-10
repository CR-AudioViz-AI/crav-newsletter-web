export const NewsletterEvents = {
  CAMPAIGN_CREATED: 'newsletter.campaign.created',
  CAMPAIGN_UPDATED: 'newsletter.campaign.updated',
  CAMPAIGN_DELETED: 'newsletter.campaign.deleted',
  CAMPAIGN_SENT: 'newsletter.campaign.sent',
  CAMPAIGN_SCHEDULED: 'newsletter.campaign.scheduled',

  DRAFT_GENERATED: 'newsletter.draft.generated',
  BLOCK_REWRITTEN: 'newsletter.block.rewritten',
  SEGMENT_SUGGESTED: 'newsletter.segment.suggested',

  AUDIENCE_CREATED: 'newsletter.audience.created',
  AUDIENCE_UPDATED: 'newsletter.audience.updated',
  CONTACT_ADDED: 'newsletter.contact.added',
  CONTACT_IMPORTED: 'newsletter.contact.imported',
  CONTACT_UNSUBSCRIBED: 'newsletter.contact.unsubscribed',

  TEMPLATE_CREATED: 'newsletter.template.created',
  TEMPLATE_USED: 'newsletter.template.used',

  EMAIL_OPENED: 'newsletter.email.opened',
  EMAIL_CLICKED: 'newsletter.email.clicked',
  EMAIL_BOUNCED: 'newsletter.email.bounced',
  EMAIL_COMPLAINED: 'newsletter.email.complained',
} as const;

export const AuthEvents = {
  USER_SIGNED_IN: 'auth.user.signed_in',
  USER_SIGNED_OUT: 'auth.user.signed_out',
  USER_SIGNED_UP: 'auth.user.signed_up',
  PASSWORD_RESET_REQUESTED: 'auth.password_reset.requested',
  PASSWORD_RESET_COMPLETED: 'auth.password_reset.completed',
} as const;

export const BillingEvents = {
  CREDITS_PURCHASED: 'billing.credits.purchased',
  CREDITS_DEDUCTED: 'billing.credits.deducted',
  SUBSCRIPTION_CREATED: 'billing.subscription.created',
  SUBSCRIPTION_UPDATED: 'billing.subscription.updated',
  SUBSCRIPTION_CANCELLED: 'billing.subscription.cancelled',
  PAYMENT_SUCCEEDED: 'billing.payment.succeeded',
  PAYMENT_FAILED: 'billing.payment.failed',
} as const;

export const WorkspaceEvents = {
  WORKSPACE_CREATED: 'workspace.created',
  WORKSPACE_UPDATED: 'workspace.updated',
  WORKSPACE_DELETED: 'workspace.deleted',
  MEMBER_INVITED: 'workspace.member.invited',
  MEMBER_JOINED: 'workspace.member.joined',
  MEMBER_REMOVED: 'workspace.member.removed',
  ROLE_CHANGED: 'workspace.role.changed',
} as const;

export type EventName =
  | typeof NewsletterEvents[keyof typeof NewsletterEvents]
  | typeof AuthEvents[keyof typeof AuthEvents]
  | typeof BillingEvents[keyof typeof BillingEvents]
  | typeof WorkspaceEvents[keyof typeof WorkspaceEvents];
