'use client';

import React from 'react';
import { AuthProvider } from '../lib/auth-context';
import { AppHeader } from './AppHeader';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppHeader />
        <main
          style={{ flex: 1, padding: '24px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}
        >
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
