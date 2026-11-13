import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export const RequirePermission = (action: string, resource: string) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, [`${resource}:${action}`]);
