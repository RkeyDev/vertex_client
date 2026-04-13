import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api/authApi';
import { loginSchema, type LoginFormData } from '../types';
import Input from '../../../components/Input';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting } 
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false }
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      // loginUser returns the response.data from the axios call
      const apiResponse = await loginUser(data); 

      console.log("Processing API Response:", apiResponse);

      // Validate success based on the backend ApiResponse structure
      if (apiResponse && apiResponse.responseCode === "200") {
        
        // Tokens and user info are nested in the 'data' field
        const { accessToken, refreshToken, userSummary } = apiResponse.data;

        /**
         * PERSISTENCE LAYER
         * Transitioned from sessionStorage to localStorage for all auth artifacts.
         * This allows the Axios interceptor to consistently find tokens.
         */
        localStorage.setItem('vertex_access_token', accessToken);
        localStorage.setItem('vertex_refresh_token', refreshToken);
        localStorage.setItem('vertex_user', JSON.stringify(userSummary));

        // Note: 'rememberMe' could still be used to set a cookie or 
        // determine session length if the backend supports it, 
        // but for now, we persist globally for simplicity.

        console.log("Success! Redirecting to dashboard...");
        navigate('/dashboard', { replace: true });
      } else {
        setServerError(apiResponse.message || "Login failed.");
      }
    } catch (error: any) {
      console.error('Login Error:', error);
      // Fallback for HTTP errors (401, 403, 500)
      const message = error.response?.data?.message || "Connection error. Please try again.";
      setServerError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
      {serverError && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Input 
          label="Email" 
          {...register('email')} 
          error={errors.email?.message} 
          placeholder="E.g jhonsmith123@gmail.com" 
        />
        <Input 
          label="Password" 
          type="password" 
          {...register('password')} 
          error={errors.password?.message} 
          placeholder="••••••••" 
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center space-x-2">
          <input 
            type="checkbox" 
            id="rememberMe" 
            {...register('rememberMe')}
            className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-400 cursor-pointer"
          />
          <label htmlFor="rememberMe" className="text-gray-800 font-bold cursor-pointer select-none">
            Remember Me
          </label>
        </div>
        <a href="#" className="text-blue-500 font-bold hover:underline">Forgot password?</a>
      </div>

      <div className="flex justify-center pt-8">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-[#539160] hover:bg-[#467a51] text-white font-bold py-2.5 px-16 rounded-lg text-2xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              Validating...
            </>
          ) : 'Sign In'}
        </button>
      </div>
    </form>
  );
};

export default LoginForm;