import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { IS_PUBLIC_KEY, Public } from '../../shared/decorators/public.decorator';
import type { AuthenticatedUser, SessionData } from './auth.types';

export { IS_PUBLIC_KEY, Public };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    return request.user;
  },
);

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionData | undefined => {
    const request = ctx.switchToHttp().getRequest<{ session?: SessionData }>();
    return request.session;
  },
);
