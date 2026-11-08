import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardFilters, SprintOption, MemberOption } from '../features/dashboard/DashboardFilters';

describe('DashboardFilters Component - Card 6 (M3 - Sprint 4)', () => {
  const mockSprints: SprintOption[] = [
    { id: 1, name: 'Sprint 1' },
    { id: 2, name: 'Sprint 2' },
    { id: 3, name: 'Sprint 3' },
    { id: 4, name: 'Sprint 4', isCurrent: true },
    { id: 5, name: 'Sprint 5' },
  ];

  const mockMembers: MemberOption[] = [
    { id: 1, name: 'Minh Triều', role: 'Leader' },
    { id: 2, name: 'Ngọc Thiện', role: 'BA' },
    { id: 3, name: 'Phúc Vương', role: 'BE' },
  ];

  it('renders sprint selector and member selector with provided options', () => {
    render(
      <DashboardFilters
        sprints={mockSprints}
        selectedSprintId={4}
        onSelectSprint={vi.fn()}
        members={mockMembers}
        selectedUserId="ALL"
        onSelectMember={vi.fn()}
      />
    );

    // Kiểm tra dropdown Sprint
    const sprintSelect = screen.getByTestId('sprint-select');
    expect(sprintSelect).toBeInTheDocument();
    expect(sprintSelect).toHaveValue('4');
    expect(screen.getByText('Sprint 4 (Hiện tại)')).toBeInTheDocument();

    // Kiểm tra dropdown Member
    const memberSelect = screen.getByTestId('member-select');
    expect(memberSelect).toBeInTheDocument();
    expect(memberSelect).toHaveValue('ALL');
    expect(screen.getByText('👥 Tất cả thành viên')).toBeInTheDocument();
    expect(screen.getByText('Minh Triều (Leader)')).toBeInTheDocument();
  });

  it('calls onSelectSprint when sprint dropdown changes', () => {
    const handleSelectSprint = vi.fn();
    render(
      <DashboardFilters
        sprints={mockSprints}
        selectedSprintId={4}
        onSelectSprint={handleSelectSprint}
        members={mockMembers}
        selectedUserId="ALL"
        onSelectMember={vi.fn()}
      />
    );

    const sprintSelect = screen.getByTestId('sprint-select');
    fireEvent.change(sprintSelect, { target: { value: '3' } });

    expect(handleSelectSprint).toHaveBeenCalledTimes(1);
    expect(handleSelectSprint).toHaveBeenCalledWith(3);
  });

  it('calls onSelectMember when a member is selected or reset to ALL', () => {
    const handleSelectMember = vi.fn();
    render(
      <DashboardFilters
        sprints={mockSprints}
        selectedSprintId={4}
        onSelectSprint={vi.fn()}
        members={mockMembers}
        selectedUserId="ALL"
        onSelectMember={handleSelectMember}
      />
    );

    const memberSelect = screen.getByTestId('member-select');

    // Chọn thành viên 2
    fireEvent.change(memberSelect, { target: { value: '2' } });
    expect(handleSelectMember).toHaveBeenCalledWith(2);

    // Chọn lại Tất cả thành viên (ALL)
    fireEvent.change(memberSelect, { target: { value: 'ALL' } });
    expect(handleSelectMember).toHaveBeenCalledWith('ALL');
  });

  it('displays loading state and disables selects when isLoading is true', () => {
    render(
      <DashboardFilters
        sprints={mockSprints}
        selectedSprintId={4}
        onSelectSprint={vi.fn()}
        members={mockMembers}
        selectedUserId="ALL"
        onSelectMember={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.getByTestId('filter-loading')).toBeInTheDocument();
    expect(screen.getByText('Đang cập nhật chỉ số...')).toBeInTheDocument();
    expect(screen.getByTestId('sprint-select')).toBeDisabled();
    expect(screen.getByTestId('member-select')).toBeDisabled();
  });
});
