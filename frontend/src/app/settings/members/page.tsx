'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';
import type { RoleCode, TenantMember } from '../../../lib/types';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorAlert } from '../../../components/ErrorAlert';
import { LoadingSpinner } from '../../../components/LoadingSpinner';

export default function MembersPage() {
  const { activeTenant, permissions } = useAuth();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái modal mời thành viên
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<RoleCode>('member');
  const [inviteSuccessToken, setInviteSuccessToken] = useState<string | null>(null);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // Trạng thái modal xác nhận xóa
  const [memberToDelete, setMemberToDelete] = useState<TenantMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManageMembers =
    permissions.includes('members:manage') || permissions.includes('tenant:manage');

  const [reloadKey, setReloadKey] = useState(0);

  const fetchMembers = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadMembers() {
      try {
        const data = await apiFetch<TenantMember[]>('/members');
        if (!ignore) {
          setMembers(data);
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof ApiError && err.statusCode === 403) {
            setError('Bạn không có quyền quản lý thành viên trong Workspace này.');
          } else {
            const msg = err instanceof Error ? err.message : 'Không thể tải danh sách thành viên';
            setError(msg);
          }
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadMembers();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setIsSubmittingInvite(true);
      setError(null);
      const res = await apiFetch<{ token: string }>('/members/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          roleCode: inviteRole,
        }),
      });

      setInviteSuccessToken(res.token);
      setInviteEmail('');
      void fetchMembers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gửi lời mời thất bại';
      setError(msg);
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleChangeRole = async (member: TenantMember, newRoleCode: RoleCode) => {
    try {
      setError(null);
      await apiFetch(`/members/${member.membershipId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ roleCode: newRoleCode }),
      });
      void fetchMembers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đổi vai trò thất bại';
      setError(msg);
    }
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    try {
      setIsDeleting(true);
      setError(null);
      await apiFetch(`/members/${memberToDelete.membershipId}`, {
        method: 'DELETE',
      });
      setMemberToDelete(null);
      void fetchMembers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Xóa thành viên thất bại';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
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
            Quản lý thành viên — {activeTenant?.name || 'Workspace'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Danh sách người dùng và phân bổ vai trò trong không gian làm việc này
          </p>
        </div>

        {canManageMembers && (
          <button type="button" className="btn btn-primary" onClick={() => setIsInviteOpen(true)}>
            + Mời thành viên
          </button>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchMembers} />}

      {isLoading ? (
        <LoadingSpinner message="Đang tải danh sách thành viên..." />
      ) : members.length === 0 ? (
        <EmptyState
          title="Chưa có thành viên nào"
          description="Hiện tại chưa có thành viên bổ sung nào trong workspace này."
          actionText={canManageMembers ? 'Mời thành viên đầu tiên' : undefined}
          onAction={() => setIsInviteOpen(true)}
          icon="👥"
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>Email</th>
                <th>Vai trò hiện tại</th>
                <th>Trạng thái</th>
                {canManageMembers && <th style={{ textAlign: 'right' }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const currentRole = member.roles[0]?.code || 'member';
                const isOwner = currentRole === 'owner';

                return (
                  <tr key={member.membershipId}>
                    <td style={{ fontWeight: 500 }}>{member.displayName || 'Thành viên'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{member.email}</td>
                    <td>
                      {canManageMembers ? (
                        <select
                          className="form-select"
                          style={{ padding: '3px 8px', fontSize: '12px', width: 'auto' }}
                          value={currentRole}
                          onChange={(e) => handleChangeRole(member, e.target.value as RoleCode)}
                        >
                          <option value="owner">Chủ sở hữu (Owner)</option>
                          <option value="admin">Quản trị viên (Admin)</option>
                          <option value="editor">Biên tập viên (Editor)</option>
                          <option value="member">Thành viên (Member)</option>
                        </select>
                      ) : (
                        <span className="badge badge-primary">{currentRole.toUpperCase()}</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${member.status === 'active' ? 'badge-success' : 'badge-danger'}`}
                      >
                        {member.status === 'active' ? 'Hoạt động' : member.status}
                      </span>
                    </td>
                    {canManageMembers && (
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => setMemberToDelete(member)}
                          disabled={isOwner}
                          title={isOwner ? 'Không thể xóa Owner trực tiếp' : 'Xóa thành viên'}
                        >
                          Xóa
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal mời thành viên mới */}
      {isInviteOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-content">
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
              Mời thành viên mới vào Workspace
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Thư mời sẽ được gửi tới email với hạn sử dụng trong 7 ngày.
            </p>

            {inviteSuccessToken ? (
              <div>
                <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                  Đã tạo lời mời thành công! Trong môi trường phát triển cục bộ, mã lời mời là:
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    wordBreak: 'break-all',
                    marginBottom: '20px',
                  }}
                >
                  {inviteSuccessToken}
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setInviteSuccessToken(null);
                      setIsInviteOpen(false);
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite}>
                <div className="form-group">
                  <label className="form-label" htmlFor="invite-email">
                    Địa chỉ Email
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    className="form-input"
                    placeholder="nguoidung@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="invite-role">
                    Vai trò phân bổ
                  </label>
                  <select
                    id="invite-role"
                    className="form-select"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as RoleCode)}
                  >
                    <option value="admin">Quản trị viên (Admin) - Toàn quyền cấu hình</option>
                    <option value="editor">
                      Biên tập viên (Editor) - Tạo và sửa Agent/Workflow
                    </option>
                    <option value="member">Thành viên (Member) - Chỉ thực thi và xem</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsInviteOpen(false)}
                    disabled={isSubmittingInvite}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmittingInvite || !inviteEmail.trim()}
                  >
                    {isSubmittingInvite ? 'Đang gửi...' : 'Gửi lời mời'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa thành viên */}
      <ConfirmDialog
        isOpen={Boolean(memberToDelete)}
        title="Xác nhận xóa thành viên?"
        message={`Bạn có chắc chắn muốn xóa thành viên khỏi không gian làm việc này? Thành viên sẽ mất quyền truy cập vào tất cả tài nguyên.`}
        resourceName={memberToDelete?.email}
        confirmText="Xác nhận xóa"
        isDanger={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setMemberToDelete(null)}
      />
    </div>
  );
}
