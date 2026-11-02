// TC-FE-AUTH-13..15 – docs/qa/test-cases-sprint3.md
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import apiClient from '../../api/client';

let lastConfig: InternalAxiosRequestConfig | undefined;
const originalAdapter = apiClient.defaults.adapter;

function respondWith(status: number): AxiosAdapter {
  return async (config) => {
    lastConfig = config;
    const response = { data: {}, status, statusText: String(status), headers: {}, config };
    if (status >= 400) {
      const err = Object.assign(new Error(`Request failed with status code ${status}`), {
        isAxiosError: true,
        config,
        response,
      });
      throw err;
    }
    return response;
  };
}

describe('apiClient (axios interceptor)', () => {
  beforeEach(() => {
    localStorage.clear();
    lastConfig = undefined;
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it('TC-FE-AUTH-13: có token -> gắn header Authorization: Bearer <token>', async () => {
    localStorage.setItem('token', 'jwt-abc');
    apiClient.defaults.adapter = respondWith(200);

    await apiClient.get('/teams');

    expect(lastConfig?.headers.Authorization).toBe('Bearer jwt-abc');
  });

  it('TC-FE-AUTH-14: không có token -> không gửi header Authorization', async () => {
    apiClient.defaults.adapter = respondWith(200);

    await apiClient.get('/teams');

    expect(lastConfig?.headers.Authorization).toBeUndefined();
  });

  it('TC-FE-AUTH-15: server trả 401 -> xoá token đã lưu', async () => {
    localStorage.setItem('token', 'jwt-het-han');
    apiClient.defaults.adapter = respondWith(401);

    await expect(apiClient.get('/teams')).rejects.toBeTruthy();

    expect(localStorage.getItem('token')).toBeNull();
  });
});
