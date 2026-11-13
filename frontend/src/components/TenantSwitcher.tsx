'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/auth-context';

export function TenantSwitcher() {
  const { activeTenant, memberships, switchTenant, isLoading } = useAuth();
  const [isChanging, setIsChanging] = useState(false);

  if (!memberships || memberships.length === 0) {
    return <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Không gian cá nhân</div>;
  }

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTenantId = e.target.value;
    if (newTenantId && newTenantId !== activeTenant?.id) {
      try {
        setIsChanging(true);
        await switchTenant(newTenantId);
      } finally {
        setIsChanging(false);
      }
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <label
        htmlFor="tenant-select"
        style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}
      >
        Workspace:
      </label>
      <select
        id="tenant-select"
        className="form-select"
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          minWidth: '150px',
          height: '30px',
        }}
        value={activeTenant?.id ?? ''}
        onChange={handleChange}
        disabled={isLoading || isChanging}
      >
        {memberships.map((m) => {
          const roleCode = m.roles[0]?.code ?? 'member';
          return (
            <option key={m.tenantId} value={m.tenantId}>
              {m.tenantName || m.tenantSlug} ({roleCode.toUpperCase()})
            </option>
          );
        })}
      </select>
    </div>
  );
}
