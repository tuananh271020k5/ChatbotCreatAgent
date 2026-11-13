import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  AUTH_CSRF_COOKIE_NAME,
  AUTH_SESSION_COOKIE_NAME,
  AUTH_SESSION_TTL_MS,
  DEFAULT_WEB_URL,
} from './auth.constants';
import { AuthenticationRequiredException } from './auth.errors';
import { AuthService } from './auth.service';
import type { CurrentUserProfile } from './auth.types';
import { generateOpaqueToken } from './crypto.util';
import { CsrfGuard } from './csrf.guard';
import { CurrentUser, Public } from './decorators';
import { OidcService } from './oidc.service';
import { SessionService } from './session.service';
import type { AuthenticatedRequest, HttpResponse } from './session.guard';

interface ActiveTenantDto {
  tenantId: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oidcService: OidcService,
    private readonly sessionService: SessionService,
  ) {}

  @Public()
  @Get('login')
  login(@Query('redirect_uri') customRedirectUri?: string): {
    authorizationUrl: string;
    state: string;
  } {
    const defaultCallback = `${DEFAULT_WEB_URL}/api/auth/callback/keycloak`;
    const redirectUri = customRedirectUri ?? process.env.OIDC_REDIRECT_URI ?? defaultCallback;

    const { url, state } = this.oidcService.createAuthorizationUrl(redirectUri);
    return { authorizationUrl: url, state };
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: HttpResponse,
  ): Promise<{ message: string; profile: CurrentUserProfile }> {
    const userAgent = (req.headers['user-agent'] as string) ?? null;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) ?? req.socket?.remoteAddress ?? null;

    const { token, profile } = await this.authService.handleOidcCallback({
      code,
      state,
      userAgent,
      ipAddress,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const csrfToken = generateOpaqueToken(24);

    res.cookie(AUTH_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: AUTH_SESSION_TTL_MS,
    });

    res.cookie(AUTH_CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: AUTH_SESSION_TTL_MS,
    });

    return {
      message: 'Đăng nhập thành công',
      profile,
    };
  }

  @Get('me')
  async me(@Req() req: AuthenticatedRequest): Promise<CurrentUserProfile> {
    if (!req.user) {
      throw new AuthenticationRequiredException();
    }
    return this.authService.getUserProfile(req.user.id, req.session?.activeTenantId);
  }

  @UseGuards(CsrfGuard)
  @Post('active-tenant')
  @HttpCode(HttpStatus.OK)
  async selectActiveTenant(
    @Body() body: ActiveTenantDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CurrentUserProfile> {
    if (!req.user || !req.rawSessionToken) {
      throw new AuthenticationRequiredException();
    }
    return this.authService.switchActiveTenant({
      token: req.rawSessionToken,
      userId: req.user.id,
      tenantId: body.tenantId,
    });
  }

  @UseGuards(CsrfGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: HttpResponse,
  ): Promise<{ message: string }> {
    if (req.rawSessionToken) {
      await this.sessionService.revokeSession(req.rawSessionToken);
    }
    res.clearCookie(AUTH_SESSION_COOKIE_NAME, { path: '/' });
    res.clearCookie(AUTH_CSRF_COOKIE_NAME, { path: '/' });
    return { message: 'Đăng xuất thành công' };
  }

  @UseGuards(CsrfGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: HttpResponse,
  ): Promise<{ message: string }> {
    if (user?.id) {
      await this.sessionService.revokeAllUserSessions(user.id);
    }
    res.clearCookie(AUTH_SESSION_COOKIE_NAME, { path: '/' });
    res.clearCookie(AUTH_CSRF_COOKIE_NAME, { path: '/' });
    return { message: 'Đã thu hồi tất cả các phiên đăng nhập' };
  }
}
