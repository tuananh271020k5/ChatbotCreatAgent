'use client';

import React, { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log lỗi lên console máy khách
    console.error('Lỗi giao diện ứng dụng:', error);
  }, [error]);

  return (
    <div style={{ maxWidth: '480px', margin: '80px auto 0', textAlign: 'center' }}>
      <div className="card" style={{ padding: '32px 24px' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '8px',
          }}
        >
          Đã xảy ra sự cố giao diện
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            marginBottom: '16px',
            lineHeight: 1.5,
          }}
        >
          Ứng dụng gặp lỗi không mong muốn khi tải trang này. Bạn có thể thử tải lại hoặc quay về
          trang chủ.
        </p>

        {error.digest && (
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginBottom: '20px',
            }}
          >
            Mã định danh lỗi: {error.digest}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => (window.location.href = '/')}
          >
            Về Trang chủ
          </button>
          <button type="button" className="btn btn-primary" onClick={reset}>
            Thử tải lại
          </button>
        </div>
      </div>
    </div>
  );
}
