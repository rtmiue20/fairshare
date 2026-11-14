export interface Card {
  id: number;
  boardId: number;
  columnId: number;
  title: string;
  description?: string;
  assigneeId?: number;
  assigneeName?: string;
  assigneeEmail?: string;
  storyPoints?: number;
  difficultyLevel?: number;
  dueDate?: string;
  position: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BoardColumn {
  id: number;
  boardId: number;
  name: string;
  position: number;
  cards: Card[];
}

export interface Board {
  id: number;
  teamId: number;
  name: string;
  description?: string;
  columns: BoardColumn[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBoardPayload {
  teamId: number;
  name: string;
  description?: string;
}

export interface CreateColumnPayload {
  name: string;
  position?: number;
}

export interface CreateCardPayload {
  title: string;
  description?: string;
  assigneeId?: number;
  storyPoints?: number;
  difficultyLevel?: number;
  dueDate?: string;
  position?: number;
}

export interface MoveCardPayload {
  targetColumnId: number;
  position?: number;
  fromColumnId?: number;
  fromColumnName?: string;
  toColumnName?: string;
}

export interface CardActivity {
  id: number;
  cardId: number;
  userId?: number;
  userName?: string;
  userEmail?: string;
  eventType: string;
  fromColumn?: string;
  toColumn?: string;
  displayMessage: string;
  commentText?: string;
  occurredAt: string;
}
