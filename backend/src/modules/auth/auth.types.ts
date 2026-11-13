import type { MembershipStatus, TenantStatus } from '../../database/schema';

export interface AuthenticatedUser {
  id: string;
  issuer: string;
  subject: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
}

export interface UserMembershipDetail {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantStatus: TenantStatus;
  status: MembershipStatus;
  roles: string[];
  permissions: string[];
}

export interface CurrentUserProfile {
  user: AuthenticatedUser;
  activeTenantId: string | null;
  activeMembership: UserMembershipDetail | null;
  memberships: UserMembershipDetail[];
  capabilities: string[];
}

export interface SessionData {
  id: string;
  userId: string;
  activeTenantId: string | null;
  createdAt: Date;
  expiresAt: Date;
  lastActiveAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface OidcTokenPayload {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
}

export interface OidcDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

export interface OidcTransientState {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
  createdAt: number;
}
