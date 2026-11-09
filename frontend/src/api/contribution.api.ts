import apiClient from './client';
import { ApiResponse } from '../types/api';
import {
  ContributionSummary,
  ContributionSummaryItem,
  EvidenceItem,
  EvidenceItemDto,
  ManualContributionRequest,
  ManualContributionItem,
} from '../types/contribution';

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

  getContributionSummary: async (teamId: number, sprintId: number): Promise<ContributionSummaryItem[]> => {
    const response = await apiClient.get<ContributionSummaryItem[]>('/contributions/summary', {
      params: { teamId, sprintId },
    });
    return response.data;
  },

  getMemberEvidence: async (teamId: number, userId: number, sprintId?: number): Promise<ApiResponse<EvidenceItem[]>> => {
    const params = sprintId ? { sprintId } : {};
    const response = await apiClient.get<ApiResponse<EvidenceItem[]>>(`/teams/${teamId}/contributions/${userId}/evidence`, { params });
    return response.data;
  },

  getEvidenceTraceability: async (
    teamId: number,
    sprintId: number,
    userId: number
  ): Promise<EvidenceItemDto[]> => {
    const response = await apiClient.get<EvidenceItemDto[]>('/contributions/evidence', {
      params: { teamId, sprintId, userId },
    });
    return response.data;
  },

  createManualContribution: async (teamId: number, payload: ManualContributionPayload): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/teams/${teamId}/contributions/manual`, payload);
    return response.data;
  },

  submitManualContribution: async (
    teamId: number,
    sprintId: number,
    userId: number,
    payload: ManualContributionRequest,
  ): Promise<ApiResponse<ManualContributionItem>> => {
    const response = await apiClient.post<ApiResponse<ManualContributionItem>>(
      '/contributions/manual',
      payload,
      { params: { teamId, sprintId, userId } },
    );
    return response.data;
  },

  getPendingManualContributions: async (
    teamId: number,
    sprintId?: number,
  ): Promise<ApiResponse<ManualContributionItem[]>> => {
    const params = sprintId ? { teamId, sprintId } : { teamId };
    const response = await apiClient.get<ApiResponse<ManualContributionItem[]>>(
      '/contributions/manual/pending',
      { params },
    );
    return response.data;
  },

  reviewManualContribution: async (
    id: number,
    reviewerId: number,
    action: 'APPROVE' | 'REJECT',
  ): Promise<ApiResponse<ManualContributionItem>> => {
    const response = await apiClient.put<ApiResponse<ManualContributionItem>>(
      `/contributions/manual/${id}/review`,
      null,
      { params: { reviewerId, action } },
    );
    return response.data;
  },
};
