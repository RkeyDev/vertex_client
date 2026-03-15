import axios from 'axios';
import {type RegisterFormData } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const registerUser = async (data: RegisterFormData): Promise<void> => {
  // Remove confirmPassword before sending to Java backend
  const { confirmPassword, ...payload } = data;
  
  await axios.post(`${API_URL}/auth/register`, payload);
};