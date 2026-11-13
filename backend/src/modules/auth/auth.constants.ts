export const AUTH_SESSION_COOKIE_NAME =
  process.env.AUTH_SESSION_COOKIE_NAME ?? 'agent_builder_session';
export const AUTH_CSRF_COOKIE_NAME = process.env.AUTH_CSRF_COOKIE_NAME ?? 'agent_builder_csrf';
export const AUTH_CSRF_HEADER_NAME = 'x-csrf-token';
export const AUTH_SESSION_TTL_MS =
  Number(process.env.AUTH_SESSION_TTL_HOURS ?? 168) * 60 * 60 * 1000; // Mặc định 7 ngày (168 giờ)
export const OIDC_STATE_TTL_MS = 10 * 60 * 1000; // 10 phút

export const DEFAULT_KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? 'http://localhost:8080';
export const DEFAULT_KEYCLOAK_REALM = process.env.KEYCLOAK_REALM ?? 'agent-builder';
export const DEFAULT_KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID ?? 'agent-builder-web';
export const DEFAULT_WEB_URL =
  process.env.WEB_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3000';
