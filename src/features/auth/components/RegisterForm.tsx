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
        <Input label="Password" type="password" {...register('password')} error={errors.password?.message} placeholder='E.g aaBBccDD11223344!' />
        <Input label="Confirm Password" type="password" {...register('confirmPassword')} error={errors.confirmPassword?.message} placeholder='Same as password' />
      </div>

      <div className="flex flex-col items-center pt-4">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-[#2C9B44] hover:bg-[#2C863F] text-white font-bold py-2 px-8 rounded disabled:opacity-50"
        >
          {isSubmitting ? 'Loading...' : 'Create Account'}
        </button>
      </div>
    </form>
  );
};

export default RegisterForm;