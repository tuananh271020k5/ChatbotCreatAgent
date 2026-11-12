import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from '../src/app/page';

describe('HomePage', () => {
  it('hiển thị trạng thái base sẵn sàng', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'Base structure is ready.' })).toBeInTheDocument();
  });
});
