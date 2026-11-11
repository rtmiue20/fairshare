import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BoardView } from '../features/board/BoardView';
import { useAuthStore } from '../store/authStore';

describe('BoardView Role-Based Permissions & UI Locking Tests (M1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Leader role with "Thêm cột" button and full card editing access', () => {
    // Log in as Leader (Minh Triều - ID 1)
    useAuthStore.getState().login('leader-token', {
      id: 1,
      email: 'trieu.31241027455@st.ueh.edu.vn',
      fullName: 'Nguyễn Văn Minh Triều',
    });

    render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    // Leader should see the "Thêm cột" button
    expect(screen.getByRole('button', { name: /Thêm cột/i })).toBeInTheDocument();

    // Leader can open any card (e.g., Member 4's card) and see "Lưu thay đổi"
    const memberCard = screen.getByText(/Chi tiết card: API cập nhật người phụ trách/i);
    fireEvent.click(memberCard);

    expect(screen.getByText('Chi tiết công việc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lưu thay đổi/i })).toBeInTheDocument();
  });

  it('hides "Thêm cột" button when switching to Member mode', () => {
    // Log in as normal Member (Hà Ngọc Thiện - ID 2)
    useAuthStore.getState().login('member-token', {
      id: 2,
      email: 'thien.31241021658@st.ueh.edu.vn',
      fullName: 'Hà Ngọc Thiện',
    });

    render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    // Click tester toggle to switch into Member mode
    const toggleBtn = screen.getByTitle(/Nhấn để đổi vai trò kiểm thử/i);
    if (toggleBtn.textContent?.includes('sang Member')) {
      fireEvent.click(toggleBtn);
    }

    // Member mode must hide the "Thêm cột" button
    expect(screen.queryByRole('button', { name: /^Thêm cột$/i })).not.toBeInTheDocument();
  });

  it('locks editing and hides "Lưu thay đổi" button when member views another member\'s card', () => {
    // Member (ID 2)
    useAuthStore.getState().login('member-token', {
      id: 2,
      email: 'thien.31241021658@st.ueh.edu.vn',
      fullName: 'Hà Ngọc Thiện',
    });

    render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    // Force Member mode
    const toggleBtn = screen.getByTitle(/Nhấn để đổi vai trò kiểm thử/i);
    if (toggleBtn.textContent?.includes('sang Member')) {
      fireEvent.click(toggleBtn);
    }

    // Open card assigned to someone else (card 104 assigned to ID 4)
    const otherMemberCard = screen.getByText(/Chi tiết card: API cập nhật người phụ trách/i);
    fireEvent.click(otherMemberCard);

    expect(screen.getByText('Chi tiết công việc')).toBeInTheDocument();

    // Must display permission notification banner
    expect(screen.getByText(/Chế độ Thành viên: Bạn chỉ có thể xem thẻ/i)).toBeInTheDocument();

    // Form inputs must be disabled
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs[0]).toBeDisabled();

    // "Lưu thay đổi" button must NOT be present
    expect(screen.queryByRole('button', { name: /Lưu thay đổi/i })).not.toBeInTheDocument();
  });
});

