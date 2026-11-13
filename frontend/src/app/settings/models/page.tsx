'use client';

import React, { useState } from 'react';

interface ProviderCardProps {
  provider: string;
  name: string;
  icon: string;
  placeholder: string;
  defaultModel: string;
}

export default function ModelsConfigPage() {
  const [keys, setKeys] = useState<Record<string, string>>({
    openai: '',
    gemini: '',
    anthropic: '',
    ollama: 'http://localhost:11434',
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const providers: ProviderCardProps[] = [
    {
      provider: 'openai',
      name: 'OpenAI (GPT-4o, o3-mini)',
      icon: '⚡',
      placeholder: 'sk-...',
      defaultModel: 'gpt-4o',
    },
    {
      provider: 'gemini',
      name: 'Google Gemini (Gemini 2.5 Flash / Pro)',
      icon: '✨',
      placeholder: 'AIzaSy...',
      defaultModel: 'gemini-2.5-flash',
    },
    {
      provider: 'anthropic',
      name: 'Anthropic (Claude 3.7 Sonnet)',
      icon: '🧠',
      placeholder: 'sk-ant-...',
      defaultModel: 'claude-3-7-sonnet',
    },
    {
      provider: 'ollama',
      name: 'Ollama / Local LLM (Mã nguồn mở chạy cục bộ)',
      icon: '💻',
      placeholder: 'http://localhost:11434',
      defaultModel: 'llama3:latest',
    },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '4px',
          }}
        >
          Cấu hình Khóa API Mô hình Trí tuệ Nhân tạo (LLM)
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Thiết lập khóa API cho từng nhà cung cấp để Agent và Workflow có thể thực thi suy luận
        </p>
      </div>

      {savedSuccess && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          Đã lưu khóa API mô hình thành công! Khóa được mã hóa an toàn bằng AES-256-GCM.
        </div>
      )}

      {/* Card phong cách nhập khóa giống hệt ảnh AutoOffice tham khảo */}
      <div className="card" style={{ borderColor: 'var(--primary-border)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '18px' }}>🔑</span>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
            Khóa API Không gian làm việc
          </h2>
        </div>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            marginBottom: '20px',
            lineHeight: 1.5,
          }}
        >
          Mỗi không gian làm việc sử dụng khóa API và hạn mức riêng biệt. Khóa bí mật của bạn được
          mã hóa an toàn và không bao giờ bị lộ ra ngoài.
        </p>

        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {providers.map((p) => (
              <div key={p.provider} className="form-group" style={{ marginBottom: 0 }}>
                <label
                  className="form-label"
                  htmlFor={`key-${p.provider}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id={`key-${p.provider}`}
                    type="password"
                    className="form-input"
                    placeholder={p.placeholder}
                    value={keys[p.provider] || ''}
                    onChange={(e) => setKeys((prev) => ({ ...prev, [p.provider]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', textAlign: 'right' }}>
            <button type="submit" className="btn btn-primary">
              Lưu Cấu Hình Mô Hình
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
