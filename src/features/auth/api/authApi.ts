import api from '../../../api/axiosInstance';
import { type LoginFormData, type RegisterFormData } from '../types';

export interface UpdateProfileFormData {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

// Existing authentication API methods...
export const loginUser = async (data: LoginFormData) => {
  const response = await api.post('/auth/login', data);
  return response.data;
};

export const resendVerificationLink = async (emailAddress: string) => {
  const response = await api.post('/auth/send-verification-link', { emailAddress });
  return response.data;
};

export const registerUser = async (data: RegisterFormData) => {
  const { confirmPassword, terms, ...backendData } = data;
  const response = await api.post('/auth/register', backendData);
  return response.data;
};

/**
 * Dispatches verified profile metadata updates to the backend context.
 * Expects partial fields matching the backend's UpdateProfileDTO.
 */
export const updateProfile = async (data: UpdateProfileFormData) => {
  const response = await api.post('/auth/profile/update', data);
  return response.data;
};