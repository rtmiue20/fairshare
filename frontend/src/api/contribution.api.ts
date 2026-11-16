import apiClient from './client';
import { ApiResponse } from '../types/api';
import {
  ContributionSummary,
  ContributionSummaryItem,
  EvidenceItem,
  EvidenceItemDto,
  ManualContributionRequest,
  ManualContributionItem,
  MultidimensionalNetworkDto,
  ImpactEventPayload,
  UpdateAvailabilityPayload,
  ResolveSuspicionPayload,
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

  getAllManualContributions: async (
    teamId: number,
    sprintId?: number,
    status?: string,
  ): Promise<ApiResponse<ManualContributionItem[]>> => {
    const params: Record<string, unknown> = { teamId };
    if (sprintId) params.sprintId = sprintId;
    if (status && status !== 'ALL') params.status = status;
    const response = await apiClient.get<ApiResponse<ManualContributionItem[]>>(
      '/contributions/manual',
      { params },
    );
    return response.data;
  },

  deleteManualContribution: async (
    id: number,
    userId: number,
  ): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/contributions/manual/${id}`,
      { params: { userId } },
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

  getNetworkGraph: async (
    teamId: number,
    sprintId?: number,
    userId?: number,
  ): Promise<ApiResponse<MultidimensionalNetworkDto>> => {
    const params: Record<string, number> = { teamId };
    if (sprintId) params.sprintId = sprintId;
    if (userId) params.userId = userId;
    const response = await apiClient.get<ApiResponse<MultidimensionalNetworkDto>>(
      '/contributions/network-graph',
      { params },
    );
    return response.data;
  },

  logImpactEvent: async (
    payload: ImpactEventPayload,
  ): Promise<ApiResponse<MultidimensionalNetworkDto>> => {
    const response = await apiClient.post<ApiResponse<MultidimensionalNetworkDto>>(
      '/contributions/impact-event',
      payload,
    );
    return response.data;
  },

  updateAvailability: async (
    payload: UpdateAvailabilityPayload,
  ): Promise<ApiResponse<MultidimensionalNetworkDto>> => {
    const response = await apiClient.put<ApiResponse<MultidimensionalNetworkDto>>(
      '/contributions/availability',
      payload,
    );
    return response.data;
  },

  resolveSuspicion: async (
    payload: ResolveSuspicionPayload,
  ): Promise<ApiResponse<MultidimensionalNetworkDto>> => {
    const response = await apiClient.put<ApiResponse<MultidimensionalNetworkDto>>(
      '/contributions/resolve-suspicion',
      payload,
    );
    return response.data;
  },

  calculateSprintScores: async (
    sprintId: number,
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    const response = await apiClient.post<ApiResponse<Record<string, unknown>>>(
      `/contributions/sprints/${sprintId}/calculate`,
    );
    return response.data;
  },
};
