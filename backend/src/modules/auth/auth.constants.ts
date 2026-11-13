export const AUTH_SESSION_COOKIE_NAME = 'agent_builder_session';
export const AUTH_CSRF_COOKIE_NAME = 'agent_builder_csrf';
export const AUTH_CSRF_HEADER_NAME = 'x-csrf-token';
export const AUTH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày
export const OIDC_STATE_TTL_MS = 10 * 60 * 1000; // 10 phút

export const DEFAULT_KEYCLOAK_URL = 'http://localhost:8080';
export const DEFAULT_KEYCLOAK_REALM = 'agent-builder';
export const DEFAULT_KEYCLOAK_CLIENT_ID = 'agent-builder-web';
