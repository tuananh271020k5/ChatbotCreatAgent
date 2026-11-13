import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { PermissionsGuard } from './permissions.guard';

@Module({
  controllers: [MembersController],
  providers: [MembersService, PermissionsGuard],
  exports: [PermissionsGuard, MembersService],
})
export class PermissionsModule {}
