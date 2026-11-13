import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ maxWidth: '440px', margin: '80px auto 0', textAlign: 'center' }}>
      <div className="card" style={{ padding: '36px 24px' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '8px',
          }}
        >
          404 — Không tìm thấy trang
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Địa chỉ bạn truy cập không tồn tại hoặc đã được di chuyển sang vị trí khác.
        </p>

        <Link href="/" className="btn btn-primary">
          Quay lại Trang chủ
        </Link>
      </div>
    </div>
  );
}
