import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth/session.guard';
import { AuthService } from '../auth/auth.service';
import { STANDARD_ROLES } from './permissions.constants';
import { REQUIRED_PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user || !request.session) {
      throw new ForbiddenException('Yêu cầu xác thực trước khi kiểm tra quyền');
    }

    // Lấy tenantId từ request params hoặc header hoặc session active tenant
    const routeTenantId =
      (request.params as Record<string, string> | undefined)?.['tenantId'] ??
      request.session.activeTenantId;

    if (!routeTenantId) {
      throw new ForbiddenException('Chưa chọn không gian làm việc (tenant) để thực hiện thao tác');
    }

    const profile = await this.authService.getUserProfile(request.user.id, routeTenantId);
    const membership = profile.activeMembership;

    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException('Bạn không phải thành viên hoạt động trong tenant này');
    }

    if (membership.tenantStatus !== 'active') {
      throw new ForbiddenException('Không gian làm việc (tenant) này đang bị tạm dừng');
    }

    // Role Owner có toàn quyền
    if (membership.roles.includes(STANDARD_ROLES.OWNER)) {
      return true;
    }

    // Kiểm tra có đủ toàn bộ permissions yêu cầu không
    const userPermissions = new Set(membership.permissions);
    const hasAll = requiredPermissions.every((p) => userPermissions.has(p));

    if (!hasAll) {
      throw new ForbiddenException(
        `Không đủ quyền hạn. Yêu cầu: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
