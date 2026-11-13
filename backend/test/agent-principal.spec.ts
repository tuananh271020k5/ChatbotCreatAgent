import { describe, expect, it } from 'vitest';
import { AgentPrincipalService } from '../src/modules/auth/agent-principal.service';
import type { AuthService } from '../src/modules/auth/auth.service';
import { STANDARD_PERMISSIONS } from '../src/modules/permissions/permissions.constants';

describe('AgentPrincipalService', () => {
  it('giới hạn quyền của Agent theo tập giao (intersection) với người kích hoạt', async () => {
    // Mock AuthService trả về profile người dùng có một số quyền
    const mockAuthService = {
      getUserProfile: async () => ({
        user: { id: 'user-1', email: 'owner@example.com' },
        activeTenantId: 'tenant-1',
        capabilities: [
          STANDARD_PERMISSIONS.WORKFLOWS_READ,
          STANDARD_PERMISSIONS.WORKFLOWS_EXECUTE,
          STANDARD_PERMISSIONS.TENANT_MANAGE,
        ],
      }),
    } as unknown as AuthService;

    const principalService = new AgentPrincipalService(mockAuthService);

    // Agent xin các quyền: workflows:execute và integrations:write
    const principal = await principalService.createExecutionPrincipal({
      agentId: 'agent-123',
      tenantId: 'tenant-1',
      userId: 'user-1',
      declaredScopes: [
        STANDARD_PERMISSIONS.WORKFLOWS_EXECUTE,
        STANDARD_PERMISSIONS.INTEGRATIONS_WRITE,
      ],
    });

    // Chỉ có workflows:execute được cấp vì integrations:write không có trong capabilities của user
    // và tenant:manage của user không bị tự động cấp cho agent!
    expect(principal.effectivePermissions).toEqual([STANDARD_PERMISSIONS.WORKFLOWS_EXECUTE]);
    expect(principal.effectivePermissions).not.toContain(STANDARD_PERMISSIONS.TENANT_MANAGE);
    expect(principal.effectivePermissions).not.toContain(STANDARD_PERMISSIONS.INTEGRATIONS_WRITE);
  });
});
