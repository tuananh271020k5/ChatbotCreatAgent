'use client';

import React from 'react';
import { EmptyState } from '../../components/EmptyState';

export default function WorkflowsPage() {
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
            Quy trình Tự động hóa (Workflows)
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Xây dựng chuỗi liên kết các bước xử lý dữ liệu, gọi API và phối hợp nhiều Agent
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => alert('Visual Workflow Builder sẽ khả dụng trong Phase Workflow Engine')}
        >
          + Tạo Workflow Mới
        </button>
      </div>

      <EmptyState
        title="Chưa có Quy trình nào"
        description="Quy trình cho phép bạn ghép nối các tác vụ thành chuỗi chạy tự động theo lịch hoặc theo sự kiện kích hoạt."
        actionText="Tạo Quy trình đầu tiên"
        onAction={() => alert('Workflow Builder đang được chuẩn bị.')}
        icon="⚡"
      />
    </div>
  );
}
