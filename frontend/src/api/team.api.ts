import apiClient from './client';
import { ApiResponse } from '../types/api';
import { Team, CreateTeamRequest, ConsentRequest } from '../types/team';

export const teamApi = {
  getTeams: async (): Promise<ApiResponse<Team[]>> => {
    const response = await apiClient.get<ApiResponse<Team[]>>('/teams');
    return response.data;
  },

  getTeamById: async (id: number): Promise<ApiResponse<Team>> => {
    const response = await apiClient.get<ApiResponse<Team>>(`/teams/${id}`);
    return response.data;
  },

  createTeam: async (payload: CreateTeamRequest): Promise<ApiResponse<Team>> => {
    const response = await apiClient.post<ApiResponse<Team>>('/teams', payload);
    return response.data;
  },

  inviteMember: async (teamId: number, email: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/teams/${teamId}/members`, { email });
    return response.data;
  },

  submitConsent: async (teamId: number, payload: ConsentRequest): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/teams/${teamId}/consent`, payload);
    return response.data;
  },
};
