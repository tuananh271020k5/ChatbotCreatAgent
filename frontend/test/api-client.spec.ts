import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiFetch, ApiError, getCsrfTokenFromCookie } from '../src/lib/api-client';

describe('apiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lấy đúng CSRF token từ cookie trình duyệt', () => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'foo=bar; agent_builder_csrf=csrf_secret_token_123; other=val',
    });

    const token = getCsrfTokenFromCookie();
    expect(token).toBe('csrf_secret_token_123');
  });

  it('gửi request GET thành công và trả về JSON', async () => {
    const mockData = { id: '1', name: 'Test' };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as unknown as Response);

    const result = await apiFetch<typeof mockData>('/test');
    expect(result).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test'),
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }),
    );
  });

  it('ném ngoại lệ ApiError với mã lỗi HTTP khi response không ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Không có quyền truy cập' }),
    } as unknown as Response);

    await expect(apiFetch('/forbidden')).rejects.toThrow(ApiError);
    await expect(apiFetch('/forbidden')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Không có quyền truy cập',
    });
  });

  it('tự động gắn header x-csrf-token cho method POST khi có cookie', async () => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'agent_builder_csrf=my-csrf-code',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as unknown as Response);

    await apiFetch('/action', {
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/action'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
      }),
    );

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = callArgs[1].headers as Headers;
    expect(headers.get('x-csrf-token')).toBe('my-csrf-code');
  });
});

