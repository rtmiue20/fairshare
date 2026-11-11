import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BoardView } from '../features/board/BoardView';
import { boardApi } from '../api/board.api';
import { teamApi } from '../api/team.api';

describe('BoardView Component - Kanban UI (M1 - Frontend)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders standard Kanban columns in order', () => {
    render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders cards with assignee name, story points, and due date', () => {
    render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    // Card titles
    expect(screen.getByText(/Khảo sát thêm 20 sinh viên về Free-rider/i)).toBeInTheDocument();
    expect(screen.getByText(/Chi tiết card: API cập nhật người phụ trách, story point, hạn/i)).toBeInTheDocument();

    // Assignee names
    expect(screen.getByText('Hà Ngọc Thiện')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn Minh Triều')).toBeInTheDocument();
    expect(screen.getAllByText('Nguyễn Phúc Vương').length).toBeGreaterThan(0);

    // Story points
    expect(screen.getAllByText(/SP/).length).toBeGreaterThan(0);
    expect(screen.getByText('2 SP')).toBeInTheDocument();
    expect(screen.getAllByText('3 SP').length).toBeGreaterThan(0);
  });

  it('displays overdue badge for past due dates', () => {
    render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    // Card id 106 has dueDate: '2026-11-02T23:30:00' which is in the past
    const overdueBadges = screen.getAllByText(/(Quá hạn)/i);
    expect(overdueBadges.length).toBeGreaterThan(0);
  });

  it('handles API loading and populated board data properly', async () => {
    const mockTeam = {
      id: 1,
      name: 'FairShare Dev Team',
      description: 'Nhóm phát triển FairShare',
      leaderId: 1,
      createdAt: '2026-10-01T00:00:00',
      members: [
        {
          id: 1,
          teamId: 1,
          user: { id: 1, email: 'leader@ueh.edu.vn', fullName: 'Minh Triều', avatarUrl: '' },
          role: 'LEADER' as const,
          hasConsented: true,
          joinedAt: '2026-10-01T00:00:00',
        },
      ],
    };

    const mockBoards = [
      {
        id: 10,
        teamId: 1,
        name: 'Sprint 4 Kanban Board',
        description: 'Bảng theo dõi tiến độ từ API',
        columns: [
          {
            id: 101,
            boardId: 10,
            name: 'Backlog Cột 1',
            position: 0,
            cards: [
              {
                id: 1001,
                boardId: 10,
                columnId: 101,
                title: 'Task được tải từ API',
                description: 'Nội dung chi tiết từ server',
                storyPoints: 5,
                position: 0,
                assigneeName: 'Minh Triều',
                assigneeId: 1,
                dueDate: '2026-11-10T23:30:00',
              },
            ],
          },
        ],
      },
    ];

    vi.spyOn(teamApi, 'getTeamById').mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: mockTeam,
    });

    vi.spyOn(boardApi, 'getBoardsByTeam').mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: mockBoards,
    });

    render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sprint 4 Kanban Board')).toBeInTheDocument();
      expect(screen.getByText('Backlog Cột 1')).toBeInTheDocument();
      expect(screen.getByText('Task được tải từ API')).toBeInTheDocument();
      expect(screen.getByText('5 SP')).toBeInTheDocument();
    });
  });

  it('handles error state with retry option when API fails', async () => {
    vi.spyOn(teamApi, 'getTeamById').mockRejectedValueOnce(new Error('Network error'));
    vi.spyOn(boardApi, 'getBoardsByTeam').mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Không thể tải dữ liệu Kanban từ máy chủ/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
    });
  });

  it('opens card detail modal when clicking on a card', () => {
    render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    const card = screen.getByText(/Khảo sát thêm 20 sinh viên về Free-rider/i);
    fireEvent.click(card);

    expect(screen.getByText('Chi tiết công việc')).toBeInTheDocument();
    expect(screen.getByText(/Người phụ trách \(Assignee\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Story Points \(Nguyên dương\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Hạn hoàn thành \(Due date\)/i)).toBeInTheDocument();
  });

  it('opens add card modal when clicking + Thêm công việc button', () => {
    render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    const addCardButton = screen.getByRole('button', { name: /\+ Thêm công việc/i });
    fireEvent.click(addCardButton);

    expect(screen.getByText('Tạo công việc mới')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ví dụ: Hoàn thành thiết kế ERD/i)).toBeInTheDocument();
  });

  it('renders drag-and-drop droppable columns and draggable cards', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    // Columns should have droppable attributes from @hello-pangea/dnd
    const droppables = container.querySelectorAll('[data-rfd-droppable-id]');
    expect(droppables.length).toBeGreaterThan(0);

    // Cards should have draggable attributes from @hello-pangea/dnd
    const draggables = container.querySelectorAll('[data-rfd-draggable-id]');
    expect(draggables.length).toBeGreaterThan(0);
  });

  it('rolls back board state and displays error if moving card fails', async () => {
    vi.spyOn(boardApi, 'moveCard').mockRejectedValueOnce(new Error('Lỗi máy chủ'));

    render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    // Click right arrow on first card in "To Do" to move to "In Progress"
    const moveRightButtons = screen.getAllByTitle(/Chuyển sang In Progress/i);
    expect(moveRightButtons.length).toBeGreaterThan(0);
    fireEvent.click(moveRightButtons[0]);

    // Should call API and then rollback on failure
    await waitFor(() => {
      expect(screen.getByText(/Không thể chuyển vị trí thẻ trên máy chủ. Đã hoàn tác giao diện./i)).toBeInTheDocument();
    });
  });

  it('displays client validation error when entering invalid story points in card detail modal', () => {
    render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    // Open card detail modal
    const card = screen.getByText(/Khảo sát thêm 20 sinh viên về Free-rider/i);
    fireEvent.click(card);

    expect(screen.getByText('Chi tiết công việc')).toBeInTheDocument();

    // Set invalid story points (-1)
    const spInput = screen.getByDisplayValue('2');
    fireEvent.change(spInput, { target: { value: '-1' } });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.submit(saveButton.closest('form')!);

    // Should display validation error
    expect(screen.getByText(/Story point phải là số nguyên dương lớn hơn 0/i)).toBeInTheDocument();
  });

  it('calls update APIs and saves card details successfully in modal', async () => {
    const updateSpy = vi.spyOn(boardApi, 'updateStoryPoints').mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: {} as never,
    });

    render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    // Open card detail modal
    const card = screen.getByText(/Khảo sát thêm 20 sinh viên về Free-rider/i);
    fireEvent.click(card);

    // Change story points to 5
    const spInput = screen.getByDisplayValue('2');
    fireEvent.change(spInput, { target: { value: '5' } });

    // Click Save
    const saveButton = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.submit(saveButton.closest('form')!);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(101, 5);
    });
  });

  it('displays API error message when card update API fails', async () => {
    vi.spyOn(boardApi, 'updateStoryPoints').mockRejectedValueOnce({
      response: { data: { message: 'Story point vượt quá giới hạn cho phép của sprint' } },
    });

    render(
      <MemoryRouter initialEntries={['/teams/1/board']}>
        <BoardView />
      </MemoryRouter>
    );

    // Open card detail modal
    const card = screen.getByText(/Khảo sát thêm 20 sinh viên về Free-rider/i);
    fireEvent.click(card);

    // Change story points to 8
    const spInput = screen.getByDisplayValue('2');
    fireEvent.change(spInput, { target: { value: '8' } });

    // Click Save
    const saveButton = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.submit(saveButton.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Story point vượt quá giới hạn cho phép của sprint/i)).toBeInTheDocument();
    });
  });

  it('allows clicking "+ Thêm thẻ" on all 4 columns when backend returns flat TeamMemberDto without crashing', async () => {
    vi.spyOn(teamApi, 'getTeamById').mockResolvedValue({
      success: true,
      message: 'OK',
      data: {
        id: 2,
        name: 'Dự án Tài chính sinh viên',
        createdAt: '2026-11-10T00:00:00Z',
        members: [
          {
            id: 1,
            userId: 5,
            fullName: 'Ngô Trọng Phúc',
            email: 'test02@gmail.com',
            role: 'LEADER',
            hasConsented: true,
            joinedAt: '2026-11-10T00:00:00Z',
          } as unknown as import('../types/team').TeamMember,
        ],
      },
    });

    vi.spyOn(boardApi, 'getBoardsByTeam').mockResolvedValue({
      success: true,
      message: 'OK',
      data: [
        {
          id: 20,
          teamId: 2,
          name: 'Task Board',
          description: 'Kanban',
          columns: [
            { id: 101, boardId: 20, name: 'To Do', position: 0, cards: [] },
            { id: 102, boardId: 20, name: 'In Progress', position: 1, cards: [] },
            { id: 103, boardId: 20, name: 'Review', position: 2, cards: [] },
            { id: 104, boardId: 20, name: 'Done', position: 3, cards: [] },
          ],
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/teams/2/board']}>
        <BoardView />
      </MemoryRouter>
    );

    // Wait for columns to render
    await waitFor(() => {
      expect(screen.getAllByText('Thêm thẻ').length).toBe(4);
    });

    // Click "Thêm thẻ" on column 1 (To Do)
    const addCardButtons = screen.getAllByText('Thêm thẻ');
    fireEvent.click(addCardButtons[0]);

    // Modal should open without TypeError and show member in select
    expect(screen.getByText('Tạo công việc mới')).toBeInTheDocument();
    expect(screen.getByText('Ngô Trọng Phúc (LEADER)')).toBeInTheDocument();
  });
});
