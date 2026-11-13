'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth-context';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await login();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '60px auto 0' }}>
      <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 800,
            margin: '0 auto 16px',
          }}
        >
          AI
        </div>

        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
            marginBottom: '6px',
            color: 'var(--text-main)',
          }}
        >
          Đăng nhập vào hệ thống
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Sử dụng tài khoản xác thực tập trung OIDC / Keycloak
        </p>

        {error && (
          <div className="alert alert-danger" style={{ textAlign: 'left', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px 16px', fontSize: '14px', marginBottom: '20px' }}
          onClick={handleLogin}
          disabled={isLoading || isSubmitting}
        >
          {isSubmitting ? 'Đang chuyển hướng tới Keycloak...' : 'Đăng nhập bằng Keycloak OIDC'}
        </button>

        <div
          style={{
            padding: '12px',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            textAlign: 'left',
            lineHeight: 1.4,
          }}
        >
          🔒 <strong>Bảo mật máy chủ:</strong> Hệ thống sử dụng phiên máy chủ opaque (HttpOnly
          Cookie), tuyệt đối không lưu access token trong bộ nhớ trình duyệt để ngăn chặn tấn công
          XSS.
        </div>
      </div>
    </div>
  );
}
