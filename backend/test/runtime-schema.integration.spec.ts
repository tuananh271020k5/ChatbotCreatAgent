import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { and, eq, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../src/database/database.providers';
import { runMigrations } from '../src/database/migrations/migration-runner';
import {
  OptimisticLockConflictError,
  requireOptimisticUpdate,
} from '../src/database/optimistic-lock';
import {
  agents,
  agentVersions,
  auditEvents,
  executionNodeLogs,
  executions,
  outboxEvents,
  tenants,
  users,
  workflows,
  workflowVersions,
} from '../src/database/schema';
import { runInTenantTransaction } from '../src/database/tenant-transaction';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const migrationsDirectory = path.resolve(__dirname, '../../database/migrations');

async function expectPostgresError(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    throw new Error(`Câu lệnh phải thất bại với PostgreSQL code ${code}`);
  } catch (error) {
    const databaseError = error as { code?: string; cause?: { code?: string } };
    expect(databaseError.code ?? databaseError.cause?.code).toBe(code);
  }
}

describe.runIf(Boolean(testDatabaseUrl))('agent workflow runtime schema', () => {
  const pool = new Pool({ connectionString: testDatabaseUrl });
  const database = createDatabaseClient(pool);
  const tenantIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    await runMigrations(pool, migrationsDirectory);
  });

  afterEach(async () => {
    if (tenantIds.length === 0) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL session_replication_role = 'replica'");
      for (const table of [
        'execution_node_logs',
        'executions',
        'outbox_events',
        'audit_events',
        'workflow_versions',
        'workflows',
        'agent_versions',
        'agents',
      ]) {
        await client.query(`DELETE FROM app.${table} WHERE tenant_id = ANY($1::uuid[])`, [
          tenantIds,
        ]);
      }
      await client.query('DELETE FROM app.tenants WHERE id = ANY($1::uuid[])', [tenantIds]);
      await client.query('DELETE FROM app.users WHERE id = ANY($1::uuid[])', [userIds]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    tenantIds.length = 0;
    userIds.length = 0;
  });

  afterAll(async () => {
    await pool.end();
  });

  async function createContext(label: string): Promise<{ tenantId: string; userId: string }> {
    const suffix = randomUUID();
    const [tenant] = await database
      .insert(tenants)
      .values({ slug: `${label}-${suffix.slice(0, 8)}`, name: `Tenant ${label}` })
      .returning({ id: tenants.id });
    const [user] = await database
      .insert(users)
      .values({ issuer: `https://${label}.runtime/${suffix}`, subject: suffix })
      .returning({ id: users.id });
    tenantIds.push(tenant.id);
    userIds.push(user.id);
    return { tenantId: tenant.id, userId: user.id };
  }

  async function createPublishedRuntime(context: { tenantId: string; userId: string }) {
    return runInTenantTransaction(database, context, async (transaction) => {
      const [agent] = await transaction
        .insert(agents)
        .values({ tenantId: context.tenantId, name: `Agent ${randomUUID()}` })
        .returning({ id: agents.id });
      const [agentVersion] = await transaction
        .insert(agentVersions)
        .values({
          tenantId: context.tenantId,
          agentId: agent.id,
          version: 1,
          config: { systemPrompt: 'Bạn là trợ lý.' },
          contentHash: 'a'.repeat(64),
          createdBy: context.userId,
        })
        .returning({ id: agentVersions.id });
      const [workflow] = await transaction
        .insert(workflows)
        .values({ tenantId: context.tenantId, name: `Workflow ${randomUUID()}` })
        .returning({ id: workflows.id });
      const [workflowVersion] = await transaction
        .insert(workflowVersions)
        .values({
          tenantId: context.tenantId,
          workflowId: workflow.id,
          version: 1,
          schemaVersion: 1,
          definition: { nodes: [], edges: [] },
          contentHash: 'b'.repeat(64),
          createdBy: context.userId,
        })
        .returning({ id: workflowVersions.id });
      return {
        agentId: agent.id,
        agentVersionId: agentVersion.id,
        workflowVersionId: workflowVersion.id,
      };
    });
  }

  it('cập nhật draft theo revision và báo conflict khi revision cũ', async () => {
    const context = await createContext('optimistic-lock');
    const [agent] = await runInTenantTransaction(database, context, async (transaction) =>
      transaction
        .insert(agents)
        .values({ tenantId: context.tenantId, name: 'Agent draft' })
        .returning(),
    );

    const updated = await runInTenantTransaction(database, context, async (transaction) =>
      requireOptimisticUpdate('Agent', 1, () =>
        transaction
          .update(agents)
          .set({
            draftConfig: { temperature: 0.2 },
            revision: sql`${agents.revision} + 1`,
            updatedAt: new Date(),
          })
          .where(and(eq(agents.id, agent.id), eq(agents.revision, 1)))
          .returning(),
      ),
    );
    expect(updated.revision).toBe(2);

    await expect(
      runInTenantTransaction(database, context, async (transaction) =>
        requireOptimisticUpdate('Agent', 1, () =>
          transaction
            .update(agents)
            .set({ revision: sql`${agents.revision} + 1` })
            .where(and(eq(agents.id, agent.id), eq(agents.revision, 1)))
            .returning(),
        ),
      ),
    ).rejects.toBeInstanceOf(OptimisticLockConflictError);
  });

  it('giữ version bất biến và execution luôn gắn version cố định', async () => {
    const first = await createContext('runtime-first');
    const second = await createContext('runtime-second');
    const published = await createPublishedRuntime(first);

    const executionId = await runInTenantTransaction(database, first, async (transaction) => {
      const [execution] = await transaction
        .insert(executions)
        .values({
          tenantId: first.tenantId,
          workflowVersionId: published.workflowVersionId,
          agentVersionId: published.agentVersionId,
          input: { message: 'Xin chào' },
        })
        .returning({ id: executions.id });
      await transaction.insert(executionNodeLogs).values({
        tenantId: first.tenantId,
        executionId: execution.id,
        nodeId: 'start',
        attempt: 1,
      });
      return execution.id;
    });

    await runInTenantTransaction(database, second, async (transaction) => {
      await expectPostgresError(
        transaction.insert(executionNodeLogs).values({
          tenantId: second.tenantId,
          executionId,
          nodeId: 'cross-tenant',
        }),
        '23503',
      );
    });

    await runInTenantTransaction(database, first, async (transaction) => {
      await expectPostgresError(
        transaction
          .update(agentVersions)
          .set({ config: { changed: true } })
          .where(eq(agentVersions.id, published.agentVersionId)),
        '55000',
      );
    });
  });

  it('ghi audit và outbox cùng transaction, rollback không tạo sự kiện giả', async () => {
    const context = await createContext('transactional-outbox');
    const entityId = randomUUID();

    await expect(
      runInTenantTransaction(database, context, async (transaction) => {
        await transaction.insert(auditEvents).values({
          tenantId: context.tenantId,
          actorUserId: context.userId,
          action: 'agent.created',
          entityType: 'agent',
          entityId,
        });
        await transaction.insert(outboxEvents).values({
          tenantId: context.tenantId,
          aggregateType: 'agent',
          aggregateId: entityId,
          eventType: 'agent.created',
          payload: { entityId },
        });
        throw new Error('mô phỏng rollback');
      }),
    ).rejects.toThrow('mô phỏng rollback');

    await runInTenantTransaction(database, context, async (transaction) => {
      expect(await transaction.select().from(auditEvents)).toEqual([]);
      expect(await transaction.select().from(outboxEvents)).toEqual([]);
    });

    const auditId = await runInTenantTransaction(database, context, async (transaction) => {
      const [audit] = await transaction
        .insert(auditEvents)
        .values({
          tenantId: context.tenantId,
          actorUserId: context.userId,
          action: 'agent.created',
          entityType: 'agent',
          entityId,
        })
        .returning({ id: auditEvents.id });
      await transaction.insert(outboxEvents).values({
        tenantId: context.tenantId,
        aggregateType: 'agent',
        aggregateId: entityId,
        eventType: 'agent.created',
        payload: { entityId },
      });
      return audit.id;
    });

    await runInTenantTransaction(database, context, async (transaction) => {
      await expectPostgresError(
        transaction
          .update(auditEvents)
          .set({ action: 'changed' })
          .where(eq(auditEvents.id, auditId)),
        '55000',
      );
    });
  });
});
