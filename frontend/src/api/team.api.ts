import apiClient from './client';
import { ApiResponse } from '../types/api';
import { Team, CreateTeamRequest, ConsentRequest, TeamMember, Role } from '../types/team';

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

  getMembers: async (teamId: number): Promise<ApiResponse<TeamMember[]>> => {
    const response = await apiClient.get<ApiResponse<TeamMember[]>>(`/teams/${teamId}/members`);
    return response.data;
  },

  inviteMember: async (teamId: number, email: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/teams/${teamId}/members`, { email });
    return response.data;
  },

  updateMemberRole: async (
    teamId: number,
    userId: number,
    role: Role
  ): Promise<ApiResponse<TeamMember>> => {
    const response = await apiClient.put<ApiResponse<TeamMember>>(
      `/teams/${teamId}/members/${userId}/role`,
      { role }
    );
    return response.data;
  },

  deleteMember: async (teamId: number, userId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/teams/${teamId}/members/${userId}`
    );
    return response.data;
  },

  submitConsent: async (teamId: number, payload: ConsentRequest): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/teams/${teamId}/consent`, payload);
    return response.data;
  },
};

