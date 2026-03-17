import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormData } from '../types';
import { registerUser } from '../api/authApi';
import Input from '../../../components/Input';

const RegisterForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data);
      alert('Account created successfully!');
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="First Name" {...register('firstName')} error={errors.firstName?.message} placeholder='E.g Jhon' />
        <Input label="Last Name" {...register('lastName')} error={errors.lastName?.message} placeholder='E.g E.g Smith' />
        <Input label="Email" type="email" {...register('email')} error={errors.email?.message} placeholder='E.g jhonsmith123@gmail.com' />
        <Input label="Username" {...register('username')} error={errors.username?.message} placeholder='E.g JhonS' />
        <Input 
          label="Password" 
          type="password" 
          hasHelp={true}
          {...register('password')} 
          error={errors.password?.message} 
          placeholder='E.g aaBBccDD11223344!' 
        />
        <Input label="Confirm Password" type="password" {...register('confirmPassword')} error={errors.confirmPassword?.message} placeholder='Same as password' />
      </div>

    <div className="flex flex-col space-y-3 mt-6">
        <div className="flex items-start space-x-3">
          <input 
            type="checkbox" 
            id="terms" 
            {...register('terms')}
            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-500 focus:ring-blue-400 cursor-pointer"
          />
          <label htmlFor="terms" className="text-gray-700 font-medium cursor-pointer select-none">
            I agree to the <span className="text-blue-500 hover:underline">Terms of Service</span>
          </label>
        </div>
        {errors.terms && <p className="text-red-500 text-xs px-8">{errors.terms.message}</p>}

        <div className="flex items-center space-x-3">
          <input 
            type="checkbox" 
            id="rememberMe" 
            {...register('rememberMe')}
            className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-400 cursor-pointer"
          />
          <label htmlFor="rememberMe" className="text-gray-700 font-medium cursor-pointer select-none">
            Remember Me
          </label>
        </div>
      </div>

      <div className="flex flex-col items-center pt-4">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-[#539160] hover:bg-[#467a51] text-white font-bold py-2.5 px-16 rounded-lg text-2xl shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? 'Loading...' : 'Create Account'}
        </button>
      </div>
    </form>
  );
};

export default RegisterForm;