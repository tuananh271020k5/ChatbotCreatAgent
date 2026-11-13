'use client';

import React from 'react';
import { EmptyState } from '../../components/EmptyState';

export default function KnowledgePage() {
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
            Kho Tri thức & Tài liệu (S3 / SeaweedFS)
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Quản lý tập tài liệu phục vụ tìm kiếm ngữ nghĩa và truy xuất thông tin (RAG)
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            alert('Chức năng tải lên S3 sẽ được kích hoạt cùng Knowledge Ingestion Module')
          }
        >
          + Tải lên Tài liệu
        </button>
      </div>

      <div className="alert alert-info" style={{ marginBottom: '20px' }}>
        Dữ liệu tài liệu được lưu trữ an toàn trong SeaweedFS Local S3 (`agent-documents`) và nhúng
        vector vào PostgreSQL pgvector.
      </div>

      <EmptyState
        title="Chưa có tài liệu nào trong kho"
        description="Tải lên tài liệu PDF, DOCX, TXT để cung cấp ngữ cảnh thông minh cho các Agent của bạn."
        actionText="Tải tài liệu mẫu"
        onAction={() => alert('Sẵn sàng cho tài liệu mẫu trong phase Knowledge Engine.')}
        icon="📚"
      />
    </div>
  );
}
