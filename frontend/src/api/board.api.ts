import apiClient from './client';
import { ApiResponse } from '../types/api';
import { Board, BoardColumn, Card, CardActivity, CreateBoardPayload, CreateColumnPayload, CreateCardPayload, MoveCardPayload } from '../types/board';

export interface CardComment {
  id: number;
  content: string;
  isHelpful: boolean;
  authorId: number;
  authorName: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: number;
  itemTitle: string;
  completed: boolean;
  completedAt?: string;
  completedByName?: string;
}

export interface CardDetail extends Card {
  comments: CardComment[];
  checklistItems: ChecklistItem[];
  progress?: number;
}

export const boardApi = {
  getBoardsByTeam: async (teamId: number): Promise<ApiResponse<Board[]>> => {
    const response = await apiClient.get<ApiResponse<Board[]>>(`/boards/team/${teamId}`);
    return response.data;
  },

  getBoardById: async (boardId: number): Promise<ApiResponse<Board>> => {
    const response = await apiClient.get<ApiResponse<Board>>(`/boards/${boardId}`);
    return response.data;
  },

  createBoard: async (payload: CreateBoardPayload): Promise<ApiResponse<Board>> => {
    const response = await apiClient.post<ApiResponse<Board>>('/boards', payload);
    return response.data;
  },

  createColumn: async (boardId: number, payload: CreateColumnPayload): Promise<ApiResponse<BoardColumn>> => {
    const response = await apiClient.post<ApiResponse<BoardColumn>>(`/boards/${boardId}/columns`, payload);
    return response.data;
  },

  updateColumn: async (columnId: number, payload: { name: string; position?: number }): Promise<ApiResponse<BoardColumn>> => {
    const response = await apiClient.put<ApiResponse<BoardColumn>>(`/boards/columns/${columnId}`, payload);
    return response.data;
  },

  deleteColumn: async (columnId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/boards/columns/${columnId}`);
    return response.data;
  },

  createCard: async (columnId: number, payload: CreateCardPayload): Promise<ApiResponse<Card>> => {
    const response = await apiClient.post<ApiResponse<Card>>(`/boards/columns/${columnId}/cards`, payload);
    return response.data;
  },

  getCardById: async (cardId: number): Promise<ApiResponse<Card>> => {
    const response = await apiClient.get<ApiResponse<Card>>(`/boards/cards/${cardId}`);
    return response.data;
  },

  moveCard: async (cardId: number, payload: MoveCardPayload): Promise<ApiResponse<Card>> => {
    const response = await apiClient.put<ApiResponse<Card>>(`/boards/cards/${cardId}/move`, payload);
    return response.data;
  },

  updateCard: async (cardId: number, payload: Partial<CreateCardPayload>): Promise<ApiResponse<Card>> => {
    const response = await apiClient.put<ApiResponse<Card>>(`/boards/cards/${cardId}`, payload);
    return response.data;
  },

  deleteCard: async (cardId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/boards/cards/${cardId}`);
    return response.data;
  },

  updateAssignee: async (cardId: number, assigneeId: number): Promise<ApiResponse<Card>> => {
    const response = await apiClient.put<ApiResponse<Card>>(`/boards/cards/${cardId}/assignee`, { assigneeId });
    return response.data;
  },

  updateStoryPoints: async (cardId: number, storyPoints: number): Promise<ApiResponse<Card>> => {
    const response = await apiClient.put<ApiResponse<Card>>(`/boards/cards/${cardId}/story-points`, { storyPoints });
    return response.data;
  },

  updateDueDate: async (cardId: number, dueDate: string): Promise<ApiResponse<Card>> => {
    const response = await apiClient.put<ApiResponse<Card>>(`/boards/cards/${cardId}/due-date`, { dueDate });
    return response.data;
  },

  addComment: async (cardId: number, content: string, isHelpful?: boolean): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/boards/cards/${cardId}/comments`, { content, isHelpful: isHelpful ?? false });
    return response.data;
  },

  /** Thêm checklist item MỚI vào DB */
  addChecklistItem: async (cardId: number, itemTitle: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/boards/cards/${cardId}/checklist-items`, { itemTitle });
    return response.data;
  },

  /** Đánh dấu hoàn thành checklist item đã tồn tại */
  completeChecklistItem: async (cardId: number, itemTitle: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/boards/cards/${cardId}/checklist-items`, { itemTitle });
    return response.data;
  },

  getCardActivities: async (cardId: number): Promise<ApiResponse<CardActivity[]>> => {
    const response = await apiClient.get<ApiResponse<CardActivity[]>>(`/boards/cards/${cardId}/activities`);
    return response.data;
  },
};
