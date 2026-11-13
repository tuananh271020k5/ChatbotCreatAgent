export type RoleCode = 'owner' | 'admin' | 'editor' | 'member';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

export interface TenantRole {
  roleId: string;
  code: RoleCode;
  name: string;
}

export interface TenantMembership {
  membershipId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  status: 'active' | 'suspended' | 'revoked';
  roles: TenantRole[];
  permissions: string[];
}

export interface CurrentUserProfile {
  user: UserProfile;
  activeTenant: {
    id: string;
    name: string;
    slug: string;
  } | null;
  memberships: TenantMembership[];
  permissions: string[];
}

export interface TenantMember {
  membershipId: string;
  status: string;
  createdAt: string;
  userId: string;
  email: string;
  displayName: string | null;
  roles: TenantRole[];
}

export interface Invitation {
  id: string;
  email: string;
  roleCode: RoleCode;
  roleName: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export interface ApiTokenItem {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ModelProviderConfig {
  id: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'custom';
  name: string;
  apiKeyMasked?: string;
  baseUrl?: string;
  models: string[];
  isDefault: boolean;
}

export interface McpServerConfig {
  id: string;
  name: string;
  transport: 'stdio' | 'sse';
  endpoint: string;
  status: 'connected' | 'disconnected' | 'disabled';
}

