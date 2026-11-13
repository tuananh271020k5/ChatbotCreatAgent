'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

export default function HomePage() {
  const { user, activeTenant } = useAuth();
  const [quickPrompt, setQuickPrompt] = useState('');

  const quickActions = [
    {
      title: 'Tạo Agent Mới',
      desc: 'Thiết lập trợ lý AI chuyên biệt theo vai trò và kỹ năng',
      icon: '🤖',
      href: '/agents',
    },
    {
      title: 'Xây dựng Workflow',
      desc: 'Quy trình tự động hóa nhiều bước với LLM và tools',
      icon: '⚡',
      href: '/workflows',
    },
    {
      title: 'Kho Tri Thức (S3)',
      desc: 'Quản lý tài liệu, vector search và ngữ cảnh RAG',
      icon: '📚',
      href: '/knowledge',
    },
    {
      title: 'Thành viên & Quyền',
      desc: 'Mời cộng sự và phân quyền Owner/Admin/Member',
      icon: '👥',
      href: '/settings/members',
    },
    {
      title: 'Khóa API Tích hợp',
      desc: 'Cấp token bảo mật kết nối với hệ thống bên ngoài',
      icon: '🔑',
      href: '/settings/tokens',
    },
    {
      title: 'Cấu hình Mô hình AI',
      desc: 'Thiết lập API key OpenAI, Gemini, Claude, Ollama',
      icon: '🧠',
      href: '/settings/models',
    },
  ];

  return (
    <div style={{ maxWidth: '840px', margin: '32px auto 0' }}>
      {/* Khối Tiêu đề chào mừng */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '8px',
          }}
        >
          Chào mừng đến với AI Agent Builder
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            maxWidth: '580px',
            margin: '0 auto',
          }}
        >
          Xây dựng, thử nghiệm và triển khai các Agent tự động hóa thông minh cho không gian làm
          việc của bạn.
        </p>
      </div>

      {/* Khung trạng thái Workspace / Cấu hình ban đầu (Phong cách Card gọn gàng như AutoOffice) */}
      <div className="card" style={{ marginBottom: '24px', borderColor: 'var(--primary-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '18px' }}>🏢</span>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
            Không gian làm việc: {activeTenant?.name || 'Mặc định'}
          </h2>
        </div>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            marginBottom: '16px',
            lineHeight: 1.5,
          }}
        >
          Dữ liệu, quyền hạn và tài nguyên được cô lập tuyệt đối theo từng workspace.
          {user
            ? ` Bạn đang đăng nhập với tài khoản ${user.email}.`
            : ' Vui lòng đăng nhập để bắt đầu sử dụng.'}
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {!user ? (
            <Link href="/login" className="btn btn-primary">
              Đăng nhập bằng Keycloak OIDC
            </Link>
          ) : (
            <>
              <Link href="/settings/members" className="btn btn-secondary btn-sm">
                Quản lý thành viên
              </Link>
              <Link href="/settings/models" className="btn btn-secondary btn-sm">
                Cấu hình API Key AI
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Dòng gợi ý tác vụ */}
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Bắt đầu nhanh với các chức năng chính bên dưới:
        </span>
      </div>

      {/* Lưới các thẻ tác vụ nhanh (Quick Actions) */}
      <div className="action-grid">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="action-card">
            <div className="action-card-icon">{action.icon}</div>
            <div className="action-card-content">
              <h3>{action.title}</h3>
              <p>{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Thanh nhập yêu cầu / prompt nhanh ở đáy */}
      <div
        style={{
          marginTop: '36px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <input
          type="text"
          className="form-input"
          style={{ border: 'none', boxShadow: 'none', padding: '6px 8px', fontSize: '14px' }}
          placeholder="Nhập yêu cầu tác vụ hoặc mô tả quy trình bạn muốn tự động hóa..."
          value={quickPrompt}
          onChange={(e) => setQuickPrompt(e.target.value)}
          aria-label="Nhập yêu cầu tác vụ"
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (quickPrompt.trim()) {
              alert(`Tác vụ: "${quickPrompt}" sẽ được xử lý khi Workflow Runner kích hoạt.`);
              setQuickPrompt('');
            }
          }}
        >
          Thực thi
        </button>
      </div>
    </div>
  );
}
