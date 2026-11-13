'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppSidebar() {
  const pathname = usePathname();

  const settingsLinks = [
    { label: 'Hồ sơ & Phiên', href: '/settings/profile', icon: '👤' },
    { label: 'Thành viên & Quyền', href: '/settings/members', icon: '👥' },
    { label: 'API Tokens', href: '/settings/tokens', icon: '🔑' },
    { label: 'Mô hình AI', href: '/settings/models', icon: '🧠' },
    { label: 'Máy chủ MCP', href: '/settings/mcp', icon: '🔌' },
  ];

  return (
    <aside
      style={{
        width: '220px',
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-light)',
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-dim)',
          padding: '4px 12px 10px',
        }}
      >
        Cài đặt hệ thống
      </div>

      {settingsLinks.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--primary)' : 'var(--text-main)',
              background: isActive ? 'var(--primary-subtle)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: '14px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
