import apiClient from './client';
import { ApiResponse } from '../types/api';

export interface ConnectTrelloPayload {
  boardId: string;
  token: string;
}

export interface SyncStatus {
  lastSyncAt?: string;
  status: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'FAILED';
  message?: string;
}

export const integrationApi = {
  connectTrello: async (teamId: number, payload: ConnectTrelloPayload): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/teams/${teamId}/integrations/trello`, payload);
    return response.data;
  },

  syncTrello: async (teamId: number): Promise<ApiResponse<SyncStatus>> => {
    const response = await apiClient.post<ApiResponse<SyncStatus>>(`/teams/${teamId}/integrations/trello/sync`);
    return response.data;
  },
};
