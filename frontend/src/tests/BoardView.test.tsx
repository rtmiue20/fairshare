import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BoardView } from '../features/board/BoardView';

describe('BoardView Component (Sprint 3)', () => {
  it('renders standard Kanban columns', () => {
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
});
