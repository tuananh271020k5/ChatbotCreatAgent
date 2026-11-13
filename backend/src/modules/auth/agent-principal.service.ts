import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

export interface AgentExecutionPrincipal {
  agentId: string;
  tenantId: string;
  triggeredByUserId: string;
  declaredScopes: string[];
  effectivePermissions: string[];
}

@Injectable()
export class AgentPrincipalService {
  constructor(private readonly authService: AuthService) {}

  async createExecutionPrincipal(params: {
    agentId: string;
    tenantId: string;
    userId: string;
    declaredScopes: string[];
  }): Promise<AgentExecutionPrincipal> {
    const profile = await this.authService.getUserProfile(params.userId, params.tenantId);
    const userPermissions = new Set(profile.capabilities);

    // Thuật toán: intersection giữa quyền của người kích hoạt và quyền Agent xin phép
    // Ngay cả khi người chạy là Owner (có quyền toàn bộ), Agent chỉ được cấp tối đa những scope mà Agent được cấu hình xin phép.
    const effectivePermissions = params.declaredScopes.filter((scope) =>
      userPermissions.has(scope),
    );

    return {
      agentId: params.agentId,
      tenantId: params.tenantId,
      triggeredByUserId: params.userId,
      declaredScopes: params.declaredScopes,
      effectivePermissions,
    };
  }
}
