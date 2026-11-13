'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import type { ApiTokenItem } from '../../../lib/types';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { EmptyState } from '../../../components/EmptyState';

export default function ApiTokensPage() {
  const { activeTenant } = useAuth();
  const [tokens, setTokens] = useState<ApiTokenItem[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [newRawSecret, setNewRawSecret] = useState<string | null>(null);
  const [tokenToRevoke, setTokenToRevoke] = useState<ApiTokenItem | null>(null);

  const handleCreateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) return;

    // Sinh token mẫu phía client giả lập API response cho Phase 5
    const mockRawToken = `agb_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const newToken: ApiTokenItem = {
      id: `tok_${Date.now()}`,
      name: tokenName.trim(),
      prefix: mockRawToken.substring(0, 12),
      scopes: ['agents:run', 'workflows:execute'],
      lastUsedAt: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    setTokens((prev) => [newToken, ...prev]);
    setNewRawSecret(mockRawToken);
    setTokenName('');
  };

  const handleRevokeToken = () => {
    if (!tokenToRevoke) return;
    setTokens((prev) => prev.filter((t) => t.id !== tokenToRevoke.id));
    setTokenToRevoke(null);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '4px',
            }}
          >
            API Tokens tích hợp — {activeTenant?.name || 'Workspace'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Quản lý các khóa bí mật dùng để gọi API từ hệ thống bên ngoài hoặc CI/CD
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
          + Tạo Token Mới
        </button>
      </div>

      {newRawSecret && (
        <div
          className="card"
          style={{
            borderColor: 'var(--primary)',
            marginBottom: '24px',
            background: 'var(--primary-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              color: 'var(--primary-hover)',
              fontWeight: 600,
            }}
          >
            <span>🔑</span>
            <span>Khóa API mới đã được tạo thành công!</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '12px' }}>
            Hãy sao chép và lưu khóa này ở nơi an toàn.{' '}
            <strong>
              Vì lý do bảo mật, bạn sẽ không thể xem lại khóa này sau khi đóng bảng thông báo.
            </strong>
          </p>
          <div
            style={{
              padding: '10px 14px',
              background: '#ffffff',
              border: '1px solid var(--primary-border)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{newRawSecret}</span>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                navigator.clipboard.writeText(newRawSecret);
                alert('Đã sao chép khóa API vào clipboard!');
              }}
            >
              Sao chép
            </button>
          </div>
          <div style={{ textAlign: 'right', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setNewRawSecret(null)}
            >
              Tôi đã lưu an toàn
            </button>
          </div>
        </div>
      )}

      {tokens.length === 0 ? (
        <EmptyState
          title="Chưa có API Token nào"
          description="Tạo khóa bí mật để tích hợp Agent và Workflow của bạn với ứng dụng bên ngoài qua REST API."
          actionText="Tạo khóa đầu tiên"
          onAction={() => setIsCreateOpen(true)}
          icon="🔑"
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên Khóa</th>
                <th>Tiền tố (Prefix)</th>
                <th>Quyền hạn (Scopes)</th>
                <th>Hạn sử dụng</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((tok) => (
                <tr key={tok.id}>
                  <td style={{ fontWeight: 500 }}>{tok.name}</td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {tok.prefix}...
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {tok.scopes.map((s) => (
                        <span key={s} className="badge badge-primary" style={{ fontSize: '10px' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {tok.expiresAt
                      ? new Date(tok.expiresAt).toLocaleDateString('vi-VN')
                      : 'Vĩnh viễn'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => setTokenToRevoke(tok)}
                    >
                      Thu hồi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal tạo token mới */}
      {isCreateOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-content">
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
              Tạo API Token Mới
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Đặt tên nhận diện cho dịch vụ hoặc ứng dụng cần kết nối.
            </p>

            <form onSubmit={handleCreateToken}>
              <div className="form-group">
                <label className="form-label" htmlFor="token-name">
                  Tên định danh Token
                </label>
                <input
                  id="token-name"
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ví dụ: Backend App, GitHub Actions..."
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={!tokenName.trim()}>
                  Tạo Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(tokenToRevoke)}
        title="Thu hồi API Token?"
        message="Hành động này sẽ vô hiệu hóa khóa ngay lập tức. Mọi ứng dụng đang dùng khóa này sẽ bị từ chối truy cập."
        resourceName={tokenToRevoke?.name}
        confirmText="Thu hồi ngay"
        isDanger={true}
        onConfirm={handleRevokeToken}
        onCancel={() => setTokenToRevoke(null)}
      />
    </div>
  );
}
