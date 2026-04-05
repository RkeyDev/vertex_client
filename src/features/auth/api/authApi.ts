import api from '../../../api/axiosInstance';
import {type RegisterFormData } from '../types';

/**
 * Sends registration data to the Spring Boot backend.
 * @param data - Validated form data from React Hook Form
 */
export const registerUser = async (data: RegisterFormData) => {
  const { confirmPassword, terms, ...backendData } = data;

  const response = await api.post('/auth/register', backendData);
  return response.data;
};