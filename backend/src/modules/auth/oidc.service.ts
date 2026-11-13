import { Injectable, Logger } from '@nestjs/common';
import {
  DEFAULT_KEYCLOAK_CLIENT_ID,
  DEFAULT_KEYCLOAK_REALM,
  DEFAULT_KEYCLOAK_URL,
  OIDC_STATE_TTL_MS,
} from './auth.constants';
import { OidcAuthenticationException } from './auth.errors';
import type { OidcTokenPayload, OidcTransientState } from './auth.types';
import { generateOpaqueToken, generatePkce } from './crypto.util';

@Injectable()
export class OidcService {
  private readonly logger = new Logger(OidcService.name);
  private readonly transientStates = new Map<string, OidcTransientState>();

  private get keycloakUrl(): string {
    return (process.env.KEYCLOAK_URL ?? DEFAULT_KEYCLOAK_URL).replace(/\/+$/, '');
  }

  private get realm(): string {
    return process.env.KEYCLOAK_REALM ?? DEFAULT_KEYCLOAK_REALM;
  }

  private get clientId(): string {
    return process.env.KEYCLOAK_CLIENT_ID ?? DEFAULT_KEYCLOAK_CLIENT_ID;
  }

  public get issuer(): string {
    return `${this.keycloakUrl}/realms/${this.realm}`;
  }

  private get authorizationEndpoint(): string {
    return `${this.issuer}/protocol/openid-connect/auth`;
  }

  private get tokenEndpoint(): string {
    return `${this.issuer}/protocol/openid-connect/token`;
  }

  createAuthorizationUrl(redirectUri: string): { url: string; state: string } {
    const state = generateOpaqueToken(24);
    const nonce = generateOpaqueToken(24);
    const { codeVerifier, codeChallenge } = generatePkce();

    this.cleanExpiredStates();

    this.transientStates.set(state, {
      state,
      nonce,
      codeVerifier,
      redirectUri,
      createdAt: Date.now(),
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
      nonce,
      scope: 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return {
      url: `${this.authorizationEndpoint}?${params.toString()}`,
      state,
    };
  }

  getTransientState(state: string): OidcTransientState {
    const saved = this.transientStates.get(state);
    if (!saved) {
      throw new OidcAuthenticationException('Giá trị state OIDC không hợp lệ hoặc đã hết hạn');
    }
    if (Date.now() - saved.createdAt > OIDC_STATE_TTL_MS) {
      this.transientStates.delete(state);
      throw new OidcAuthenticationException('Phiên đăng nhập OIDC đã hết hạn');
    }
    this.transientStates.delete(state);
    return saved;
  }

  async exchangeCodeForTokens(
    code: string,
    stateData: OidcTransientState,
  ): Promise<{ idToken: string; accessToken: string }> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      code,
      redirect_uri: stateData.redirectUri,
      code_verifier: stateData.codeVerifier,
    });

    const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;
    if (clientSecret) {
      body.set('client_secret', clientSecret);
    }

    try {
      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`OIDC token exchange thất bại: ${response.status} - ${errorText}`);
        throw new OidcAuthenticationException(
          'Không thể trao đổi mã xác thực với nhà cung cấp OIDC',
        );
      }

      const data = (await response.json()) as { id_token?: string; access_token?: string };
      if (!data.id_token || !data.access_token) {
        throw new OidcAuthenticationException(
          'Phản hồi token từ OIDC thiếu id_token hoặc access_token',
        );
      }

      return {
        idToken: data.id_token,
        accessToken: data.access_token,
      };
    } catch (err) {
      if (err instanceof OidcAuthenticationException) throw err;
      this.logger.error('Lỗi kết nối tới OIDC token endpoint', err);
      throw new OidcAuthenticationException('Lỗi mạng khi kết nối tới máy chủ định danh OIDC');
    }
  }

  verifyIdTokenPayload(idToken: string, expectedNonce?: string): OidcTokenPayload {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new OidcAuthenticationException('Định dạng ID token không hợp lệ');
    }

    const payloadPart = parts[1];
    if (!payloadPart) {
      throw new OidcAuthenticationException('Thiếu phần payload trong ID token');
    }

    let payload: OidcTokenPayload;
    try {
      const json = Buffer.from(payloadPart, 'base64url').toString('utf8');
      payload = JSON.parse(json) as OidcTokenPayload;
    } catch {
      throw new OidcAuthenticationException('Không thể giải mã payload ID token');
    }

    const nowSec = Math.floor(Date.now() / 1000);

    // Kiểm tra hạn token
    if (payload.exp && payload.exp < nowSec) {
      throw new OidcAuthenticationException('ID token đã hết hạn');
    }

    // Kiểm tra nonce nếu được cung cấp
    if (expectedNonce && payload.nonce && payload.nonce !== expectedNonce) {
      throw new OidcAuthenticationException('Nonce trong ID token không khớp');
    }

    // Kiểm tra issuer
    if (payload.iss && !payload.iss.startsWith(this.keycloakUrl)) {
      throw new OidcAuthenticationException(`Issuer không hợp lệ: ${payload.iss}`);
    }

    return payload;
  }

  private cleanExpiredStates(): void {
    const now = Date.now();
    for (const [key, state] of this.transientStates.entries()) {
      if (now - state.createdAt > OIDC_STATE_TTL_MS) {
        this.transientStates.delete(key);
      }
    }
  }
}
