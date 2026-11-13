import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AgentPrincipalService } from './agent-principal.service';
import { ApiTokensService } from './api-tokens.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CredentialCryptoService } from './credential-crypto.service';
import { CsrfGuard } from './csrf.guard';
import { OidcService } from './oidc.service';
import { RateLimitGuard, RateLimiterService } from './rate-limiter.service';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    OidcService,
    SessionService,
    CsrfGuard,
    SessionGuard,
    AgentPrincipalService,
    ApiTokensService,
    RateLimiterService,
    RateLimitGuard,
    CredentialCryptoService,
    {
      provide: APP_GUARD,
      useClass: SessionGuard,
    },
  ],
  exports: [
    AuthService,
    OidcService,
    SessionService,
    SessionGuard,
    CsrfGuard,
    AgentPrincipalService,
    ApiTokensService,
    RateLimiterService,
    RateLimitGuard,
    CredentialCryptoService,
  ],
})
export class AuthModule {}
