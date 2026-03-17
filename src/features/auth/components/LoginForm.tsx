import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../types';
import Input from '../../../components/Input';

const LoginForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log("Logging in...", data);
    // Call your login API here
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
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
          placeholder="E.g aaBBccDD11223344!" 
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
        
        <a href="#" className="text-blue-500 font-bold hover:underline">
          Forgot password?
        </a>
      </div>

      <div className="flex justify-center pt-8">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-[#539160] hover:bg-[#467a51] text-white font-bold py-2.5 px-16 rounded-lg text-2xl shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          Sign In
        </button>
      </div>
    </form>
  );
};

export default LoginForm;