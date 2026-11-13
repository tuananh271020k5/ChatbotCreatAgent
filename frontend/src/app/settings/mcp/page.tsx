'use client';

import React from 'react';
import { EmptyState } from '../../../components/EmptyState';

export default function McpSettingsPage() {
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
          Máy chủ Giao thức Ngữ cảnh Mô hình (MCP - Model Context Protocol)
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Kết nối Agent của bạn với các máy chủ công cụ ngoài (Git, PostgreSQL, Filesystem, v.v.)
          qua chuẩn MCP
        </p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: '20px' }}>
        Tính năng tích hợp MCP Servers đang ở chế độ thử nghiệm nội bộ và sẽ được kích hoạt toàn
        diện trong Phase MCP & Tool Runtime.
      </div>

      <EmptyState
        title="Chưa kết nối Máy chủ MCP nào"
        description="Giao thức MCP cho phép Agent tương tác trực tiếp với hệ sinh thái công cụ bên ngoài theo tiêu chuẩn mở của Anthropic."
        actionText="Tìm hiểu về chuẩn MCP"
        onAction={() => window.open('https://modelcontextprotocol.io', '_blank')}
        icon="🔌"
      />
    </div>
  );
}
