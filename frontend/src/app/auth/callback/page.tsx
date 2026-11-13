'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';
import { LoadingSpinner } from '../../../components/LoadingSpinner';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const initialError =
    !code || !state ? 'Thiếu tham số code hoặc state từ nhà cung cấp OIDC.' : null;
  const [error, setError] = useState<string | null>(initialError);

  useEffect(() => {
    if (typeof code !== 'string' || typeof state !== 'string' || !code || !state) {
      return;
    }

    const query = new URLSearchParams({ code, state }).toString();

    async function handleExchange() {
      try {
        await apiFetch(`/auth/callback?${query}`);
        await refreshUser();
        router.push('/');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Xác thực OIDC thất bại';
        setError(msg);
      }
    }

    void handleExchange();
  }, [code, state, refreshUser, router]);

  if (error) {
    return (
      <div style={{ maxWidth: '420px', margin: '60px auto 0' }}>
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--danger)',
              marginBottom: '8px',
            }}
          >
            Đăng nhập thất bại
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            {error}
          </p>
          <a href="/login" className="btn btn-primary btn-sm">
            Quay lại trang đăng nhập
          </a>
        </div>
      </div>
    );
  }

  return <LoadingSpinner message="Đang hoàn tất đăng nhập và thiết lập phiên..." />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Đang xử lý..." />}>
      <CallbackContent />
    </Suspense>
  );
}
