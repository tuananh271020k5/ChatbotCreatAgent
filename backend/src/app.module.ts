import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { PermissionsModule } from './modules/permissions/permissions.module';

@Module({
  imports: [DatabaseModule, AuthModule, PermissionsModule],
})
export class AppModule {}
