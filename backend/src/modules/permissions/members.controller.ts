import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import { CsrfGuard } from '../auth/csrf.guard';
import { MembersService } from './members.service';
import { STANDARD_PERMISSIONS } from './permissions.constants';
import { RequirePermissions } from './permissions.decorator';
import { PermissionsGuard } from './permissions.guard';

interface CreateInvitationDto {
  email: string;
  roleCode: string;
}

interface AcceptInvitationDto {
  token: string;
}

interface UpdateMemberRoleDto {
  roleCode: string;
}

@Controller()
@UseGuards(PermissionsGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('tenants/:tenantId/members')
  @RequirePermissions(STANDARD_PERMISSIONS.MEMBERS_READ)
  async listMembers(@Param('tenantId') tenantId: string) {
    return this.membersService.listMembers(tenantId);
  }

  @UseGuards(CsrfGuard)
  @Post('tenants/:tenantId/invitations')
  @RequirePermissions(STANDARD_PERMISSIONS.MEMBERS_INVITE)
  async inviteMember(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateInvitationDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.membersService.createInvitation({
      tenantId,
      email: body.email,
      roleCode: body.roleCode,
      createdByUserId: user.id,
    });
  }

  @UseGuards(CsrfGuard)
  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(@Body() body: AcceptInvitationDto, @CurrentUser() user: { id: string }) {
    return this.membersService.acceptInvitation(body.token, user.id);
  }

  @UseGuards(CsrfGuard)
  @Delete('tenants/:tenantId/invitations/:invitationId')
  @RequirePermissions(STANDARD_PERMISSIONS.MEMBERS_INVITE)
  async revokeInvitation(
    @Param('tenantId') tenantId: string,
    @Param('invitationId') invitationId: string,
  ) {
    await this.membersService.revokeInvitation(invitationId, tenantId);
    return { message: 'Đã thu hồi lời mời' };
  }

  @UseGuards(CsrfGuard)
  @Patch('tenants/:tenantId/members/:memberId/role')
  @RequirePermissions(STANDARD_PERMISSIONS.MEMBERS_UPDATE_ROLE)
  async updateRole(
    @Param('tenantId') tenantId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberRoleDto,
  ) {
    await this.membersService.updateMemberRole({
      tenantId,
      membershipId: memberId,
      newRoleCode: body.roleCode,
    });
    return { message: 'Cập nhật vai trò thành công' };
  }

  @UseGuards(CsrfGuard)
  @Delete('tenants/:tenantId/members/:memberId')
  @RequirePermissions(STANDARD_PERMISSIONS.MEMBERS_REMOVE)
  async removeMember(@Param('tenantId') tenantId: string, @Param('memberId') memberId: string) {
    await this.membersService.removeMember(tenantId, memberId);
    return { message: 'Đã xóa thành viên khỏi không gian làm việc' };
  }
}
