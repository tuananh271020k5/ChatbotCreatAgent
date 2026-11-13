import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../src/components/ConfirmDialog';
import { EmptyState } from '../src/components/EmptyState';
import { ErrorAlert } from '../src/components/ErrorAlert';
import { LoadingSpinner } from '../src/components/LoadingSpinner';

describe('UI Components', () => {
  it('EmptyState render đúng tiêu đề, mô tả và nút hành động', () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="Danh sách rỗng"
        description="Không tìm thấy mục nào"
        actionText="Thêm mới"
        onAction={onAction}
      />,
    );

    expect(screen.getByText('Danh sách rỗng')).toBeInTheDocument();
    expect(screen.getByText('Không tìm thấy mục nào')).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: 'Thêm mới' });
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('ConfirmDialog không render khi isOpen=false', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        title="Xóa dữ liệu"
        message="Bạn có chắc không?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByText('Xóa dữ liệu')).not.toBeInTheDocument();
  });

  it('ConfirmDialog render và xử lý sự kiện confirm/cancel khi isOpen=true', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Xác nhận xóa tài nguyên"
        message="Hành động này không thể hoàn tác."
        resourceName="user@example.com"
        confirmText="Đồng ý xóa"
        cancelText="Bỏ qua"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('Xác nhận xóa tài nguyên')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Đồng ý xóa' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('ErrorAlert hiển thị đúng thông báo lỗi và nút thử lại', () => {
    const onRetry = vi.fn();
    render(<ErrorAlert message="Lỗi kết nối máy chủ" onRetry={onRetry} />);

    expect(screen.getByText('Lỗi kết nối máy chủ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('LoadingSpinner hiển thị thông báo tải', () => {
    render(<LoadingSpinner message="Đang nạp dữ liệu..." />);
    expect(screen.getByText('Đang nạp dữ liệu...')).toBeInTheDocument();
  });
});
