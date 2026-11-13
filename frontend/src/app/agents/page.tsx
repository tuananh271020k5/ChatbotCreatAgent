'use client';

import React from 'react';
import { EmptyState } from '../../components/EmptyState';

export default function AgentsPage() {
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
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '4px',
            }}
          >
            Trợ lý Trí tuệ Nhân tạo (Agents)
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Quản lý và cấu hình các Agent tự hành với tính cách, kỹ năng và công cụ riêng
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => alert('Chức năng tạo Agent sẽ khả dụng trong Phase Agent & Workflow')}
        >
          + Tạo Agent Mới
        </button>
      </div>

      <EmptyState
        title="Chưa có Agent nào được tạo"
        description="Bắt đầu tạo Agent đầu tiên để giao phó các công việc phân tích, viết mã hoặc tổng hợp dữ liệu."
        actionText="Tạo Agent mẫu"
        onAction={() => alert('Agent mẫu sẽ được khởi tạo trong Phase tiếp theo.')}
        icon="🤖"
      />
    </div>
  );
}
