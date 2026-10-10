import apiClient from './client';
import { ApiResponse } from '../types/api';
import { ContributionSummary, EvidenceItem } from '../types/contribution';

export interface ManualContributionPayload {
  title: string;
  description: string;
  weight: number;
}

export const contributionApi = {
  getContributions: async (teamId: number, sprintId?: number): Promise<ApiResponse<ContributionSummary>> => {
    const params = sprintId ? { sprintId } : {};
    const response = await apiClient.get<ApiResponse<ContributionSummary>>(`/teams/${teamId}/contributions`, { params });
    return response.data;
  },

  getMemberEvidence: async (teamId: number, userId: number): Promise<ApiResponse<EvidenceItem[]>> => {
    const response = await apiClient.get<ApiResponse<EvidenceItem[]>>(`/teams/${teamId}/contributions/${userId}/evidence`);
    return response.data;
  },

  createManualContribution: async (teamId: number, payload: ManualContributionPayload): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/teams/${teamId}/contributions/manual`, payload);
    return response.data;
  },
};
