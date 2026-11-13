import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from '../src/app/page';

vi.mock('../src/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'usr_1', email: 'test@example.com', displayName: 'Test User' },
    activeTenant: { id: 'ten_1', name: 'Không gian thử nghiệm', slug: 'test-ws' },
    memberships: [],
    permissions: [],
    isLoading: false,
    logout: vi.fn(),
  }),
}));

describe('HomePage', () => {
  it('hiển thị tiêu đề chào mừng và các thẻ tác vụ nhanh', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: 'Chào mừng đến với AI Agent Builder' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Không gian làm việc: Không gian thử nghiệm/)).toBeInTheDocument();
    expect(screen.getByText('Tạo Agent Mới')).toBeInTheDocument();
    expect(screen.getByText('Xây dựng Workflow')).toBeInTheDocument();
  });
});
