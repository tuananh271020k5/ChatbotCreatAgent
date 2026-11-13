'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { ConfirmDialog } from '../../../components/ConfirmDialog';

export default function ProfilePage() {
  const { user, memberships, logout, logoutAll, isLoading } = useAuth();
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogoutAll = async () => {
    try {
      setIsProcessing(true);
      await logoutAll();
    } finally {
      setIsProcessing(false);
      setShowLogoutAllConfirm(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '4px',
          }}
        >
          Hồ sơ người dùng & Phiên đăng nhập
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Xem thông tin định danh cá nhân và quản lý các phiên kết nối máy chủ
        </p>
      </div>

      {/* Khối thông tin cá nhân */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h2
          style={{
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '16px',
            color: 'var(--text-main)',
          }}
        >
          Thông tin tài khoản
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr',
            gap: '12px',
            fontSize: '13px',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>Họ và tên:</span>
          <span style={{ fontWeight: 500 }}>{user?.displayName || 'Chưa cập nhật'}</span>

          <span style={{ color: 'var(--text-muted)' }}>Email xác thực:</span>
          <span style={{ fontWeight: 500 }}>{user?.email || 'N/A'}</span>

          <span style={{ color: 'var(--text-muted)' }}>Mã người dùng:</span>
          <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
            {user?.id || 'N/A'}
          </span>
        </div>
      </div>

      {/* Khối danh sách Workspace tham gia */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h2
          style={{
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '16px',
            color: 'var(--text-main)',
          }}
        >
          Không gian làm việc đã tham gia ({memberships.length})
        </h2>

        {memberships.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Bạn chưa tham gia không gian nào.
          </p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên Không gian</th>
                  <th>Định danh (Slug)</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => (
                  <tr key={m.membershipId}>
                    <td style={{ fontWeight: 500 }}>{m.tenantName}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {m.tenantSlug}
                    </td>
                    <td>
                      <span className="badge badge-primary">
                        {(m.roles[0]?.code || 'member').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${m.status === 'active' ? 'badge-success' : 'badge-danger'}`}
                      >
                        {m.status === 'active' ? 'Đang hoạt động' : m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Khối quản lý phiên đăng nhập */}
      <div className="card" style={{ borderColor: 'var(--danger-border)' }}>
        <h2
          style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--danger)' }}
        >
          Vùng nguy hiểm & Phiên kết nối
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Bạn có thể đăng xuất khỏi thiết bị hiện tại hoặc hủy toàn bộ phiên đang đăng nhập ở các
          trình duyệt khác.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={logout} disabled={isLoading}>
            Đăng xuất thiết bị này
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setShowLogoutAllConfirm(true)}
            disabled={isLoading}
          >
            Đăng xuất tất cả thiết bị
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutAllConfirm}
        title="Thu hồi toàn bộ phiên đăng nhập?"
        message="Hành động này sẽ hủy tất cả phiên đăng nhập trên mọi thiết bị và trình duyệt của tài khoản này. Bạn sẽ cần phải đăng nhập lại."
        confirmText="Đăng xuất tất cả"
        isDanger={true}
        isLoading={isProcessing}
        onConfirm={handleLogoutAll}
        onCancel={() => setShowLogoutAllConfirm(false)}
      />
    </div>
  );
}
