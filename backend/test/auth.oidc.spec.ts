import { describe, expect, it } from 'vitest';
import { OidcAuthenticationException } from '../src/modules/auth/auth.errors';
import { OidcService } from '../src/modules/auth/oidc.service';

describe('OidcService', () => {
  const service = new OidcService();

  it('tạo authorization URL chứa PKCE challenge, state và nonce', () => {
    const redirectUri = 'http://localhost:3000/callback';
    const { url, state } = service.createAuthorizationUrl(redirectUri);

    expect(url).toContain('response_type=code');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain(`state=${state}`);
    expect(url).toContain('nonce=');

    const retrieved = service.getTransientState(state);
    expect(retrieved.state).toBe(state);
    expect(retrieved.redirectUri).toBe(redirectUri);
  });

  it('từ chối state không tồn tại hoặc đã được lấy', () => {
    expect(() => service.getTransientState('non-existent-state')).toThrow(
      OidcAuthenticationException,
    );
  });

  it('giải mã và kiểm tra ID token payload hợp lệ', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const mockHeader = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
    const mockPayload = Buffer.from(
      JSON.stringify({
        iss: 'http://localhost:8080/realms/agent-builder',
        sub: 'user-sub-123',
        aud: 'agent-builder-web',
        exp: nowSec + 3600,
        iat: nowSec,
        email: 'user@example.com',
        email_verified: true,
        nonce: 'valid-nonce-abc',
      }),
    ).toString('base64url');
    const mockSignature = Buffer.from('mock-sig').toString('base64url');

    const token = `${mockHeader}.${mockPayload}.${mockSignature}`;
    const verified = service.verifyIdTokenPayload(token, 'valid-nonce-abc');

    expect(verified.sub).toBe('user-sub-123');
    expect(verified.email).toBe('user@example.com');
  });

  it('từ chối ID token khi sai nonce hoặc hết hạn', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const mockHeader = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
    const mockPayload = Buffer.from(
      JSON.stringify({
        iss: 'http://localhost:8080/realms/agent-builder',
        sub: 'user-sub-123',
        exp: nowSec - 100, // Đã hết hạn
        iat: nowSec - 200,
        nonce: 'valid-nonce',
      }),
    ).toString('base64url');

    const token = `${mockHeader}.${mockPayload}.sig`;
    expect(() => service.verifyIdTokenPayload(token, 'valid-nonce')).toThrow(
      OidcAuthenticationException,
    );
  });
});
