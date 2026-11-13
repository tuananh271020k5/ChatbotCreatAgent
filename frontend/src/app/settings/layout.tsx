'use client';

import React from 'react';
import { AppSidebar } from '../../components/AppSidebar';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        minHeight: '620px',
        boxShadow: 'var(--shadow-sm)',
        marginTop: '16px',
      }}
    >
      <AppSidebar />
      <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>{children}</div>
    </div>
  );
}
