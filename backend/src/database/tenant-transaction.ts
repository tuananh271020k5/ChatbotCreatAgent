import { sql } from 'drizzle-orm';
import type { DatabaseClient } from './database.tokens';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AuthenticatedTenantContext {
  tenantId: string;
  userId: string;
}

export type TenantTransaction = Parameters<Parameters<DatabaseClient['transaction']>[0]>[0];

function assertUuid(value: string, fieldName: keyof AuthenticatedTenantContext): void {
  if (!uuidPattern.test(value)) {
    throw new TypeError(`${fieldName} phải là UUID hợp lệ`);
  }
}

export async function runInTenantTransaction<T>(
  database: DatabaseClient,
  context: AuthenticatedTenantContext,
  operation: (transaction: TenantTransaction) => Promise<T>,
): Promise<T> {
  assertUuid(context.tenantId, 'tenantId');
  assertUuid(context.userId, 'userId');

  return database.transaction(async (transaction) => {
    await transaction.execute(sql`SET LOCAL ROLE app_runtime`);
    await transaction.execute(
      sql`SELECT set_config('app.current_tenant_id', ${context.tenantId}, true)`,
    );
    await transaction.execute(
      sql`SELECT set_config('app.current_user_id', ${context.userId}, true)`,
    );
    return operation(transaction);
  });
}
