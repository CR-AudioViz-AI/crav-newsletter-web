export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

export interface UserContext {
  sub: string;
  email: string;
  org_id: string;
  workspace_id: string;
  role: Role;
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export function hasRole(user: UserContext, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
}

export function assertRole(user: UserContext | null, requiredRole: Role): void {
  if (!user) {
    throw new Error('Unauthorized: No user context');
  }

  if (!hasRole(user, requiredRole)) {
    throw new Error(`Forbidden: Requires ${requiredRole} role, but user has ${user.role}`);
  }
}

export const permissions = {
  viewLists: (user: UserContext) => hasRole(user, 'viewer'),
  importCSV: (user: UserContext) => hasRole(user, 'editor'),
  deleteLists: (user: UserContext) => hasRole(user, 'admin'),

  viewTemplates: (user: UserContext) => hasRole(user, 'viewer'),
  createTemplates: (user: UserContext) => hasRole(user, 'editor'),
  editTemplates: (user: UserContext) => hasRole(user, 'editor'),
  deleteTemplates: (user: UserContext) => hasRole(user, 'admin'),

  viewCampaigns: (user: UserContext) => hasRole(user, 'viewer'),
  createCampaigns: (user: UserContext) => hasRole(user, 'editor'),
  scheduleCampaigns: (user: UserContext) => hasRole(user, 'editor'),
  deleteCampaigns: (user: UserContext) => hasRole(user, 'admin'),

  viewDNS: (user: UserContext) => hasRole(user, 'viewer'),
  manageDNS: (user: UserContext) => hasRole(user, 'admin'),
  manageDKIM: (user: UserContext) => hasRole(user, 'admin'),

  viewBilling: (user: UserContext) => hasRole(user, 'admin'),
  manageBilling: (user: UserContext) => hasRole(user, 'owner'),

  manageUsers: (user: UserContext) => hasRole(user, 'owner'),
  manageWorkspaces: (user: UserContext) => hasRole(user, 'owner'),
} as const;

export function canPerformAction(
  user: UserContext | null,
  action: keyof typeof permissions
): boolean {
  if (!user) return false;
  return permissions[action](user);
}

export function assertPermission(
  user: UserContext | null,
  action: keyof typeof permissions
): void {
  if (!canPerformAction(user, action)) {
    throw new Error(`Forbidden: User cannot perform action: ${action}`);
  }
}
