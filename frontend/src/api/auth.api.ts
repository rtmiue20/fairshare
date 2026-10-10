import apiClient from './client';
import { ApiResponse } from '../types/api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponseData {
  accessToken: string;
  tokenType: string;
  user: {
    id: number;
    email: string;
    fullName: string;
  };
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<ApiResponse<AuthResponseData>> => {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', payload);
    return response.data;
  },

  register: async (payload: RegisterPayload): Promise<ApiResponse<AuthResponseData>> => {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/register', payload);
    return response.data;
  },
};
