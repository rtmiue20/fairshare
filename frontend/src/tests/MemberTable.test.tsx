import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemberTable } from '../features/team/MemberTable';
import type { TeamMember } from '../types/team';

const MOCK_MEMBERS: TeamMember[] = [
  {
    id: 101,
    role: 'LEADER',
    hasConsented: true,
    joinedAt: '2026-10-15T08:00:00Z',
    user: {
      id: 1,
      email: 'trieu.31241027455@st.ueh.edu.vn',
      fullName: 'Nguyễn Văn Minh Triều',
    },
  },
  {
    id: 102,
    role: 'MEMBER',
    hasConsented: true,
    joinedAt: '2026-10-15T08:30:00Z',
    user: {
      id: 2,
      email: 'thien.31241021658@st.ueh.edu.vn',
      fullName: 'Hà Ngọc Thiện',
    },
  },
];

describe('MemberTable Component (Sprint 4)', () => {
  it('renders members list correctly with names and roles', () => {
    render(<MemberTable members={MOCK_MEMBERS} />);

    expect(screen.getByText('Nguyễn Văn Minh Triều')).toBeInTheDocument();
    expect(screen.getByText('Hà Ngọc Thiện')).toBeInTheDocument();
    expect(screen.getByText('Trưởng nhóm')).toBeInTheDocument();
    expect(screen.getByText('trieu.31241027455@st.ueh.edu.vn')).toBeInTheDocument();
  });

  it('renders role selector and calls onUpdateRole when role changes', () => {
    const handleUpdateRole = vi.fn();
    render(
      <MemberTable
        members={MOCK_MEMBERS}
        isLeader={true}
        onUpdateRole={handleUpdateRole}
      />
    );

    const roleSelects = screen.getAllByRole('combobox');
    expect(roleSelects.length).toBe(2);

    // Change role of member 2 to LEADER
    fireEvent.change(roleSelects[1], { target: { value: 'LEADER' } });
    expect(handleUpdateRole).toHaveBeenCalledWith(2, 'LEADER');
  });

  it('renders remove button and calls onRemoveMember on click', () => {
    const handleRemoveMember = vi.fn();
    render(
      <MemberTable
        members={MOCK_MEMBERS}
        isLeader={true}
        onRemoveMember={handleRemoveMember}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /Xóa/i });
    expect(deleteButtons.length).toBe(2);

    fireEvent.click(deleteButtons[1]);
    expect(handleRemoveMember).toHaveBeenCalledWith(2);
  });
});
