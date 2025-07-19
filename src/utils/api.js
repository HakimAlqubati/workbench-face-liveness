// src/utils/api.js
import { API_BASE_URL } from '../config';
import { getToken } from './auth';

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await response.json();
  return data;
}
