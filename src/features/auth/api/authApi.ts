import api from '../../../api/axiosInstance';
import { type LoginFormData, type RegisterFormData } from '../types';

// The backend returns ApiResponse<LoginResponseDTO>
export const loginUser = async (data: LoginFormData) => {
  // We send the whole data object including 'rememberMe' to the backend
  const response = await api.post('/auth/login', data);
  return response.data; // This is the ApiResponse object
};

export const registerUser = async (data: RegisterFormData) => {
  const { confirmPassword, terms, ...backendData } = data;
  const response = await api.post('/auth/register', backendData);
  return response.data;
};