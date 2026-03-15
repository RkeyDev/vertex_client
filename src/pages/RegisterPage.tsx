import React from 'react';
import RegisterForm from '../features/auth/components/RegisterForm';

const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-gray-300 flex items-center justify-center p-4">
      <div className="bg-[#EAEAEA] p-10 rounded-lg shadow-xl w-full max-w-2xl">
        <h1 className="text-4xl font-black mb-8">Vertex</h1>
        <h2 className="text-3xl font-bold mb-8 text-center tracking-wider">Create an Account</h2>
        <RegisterForm />
        <div className="w-full text-right mt-16 text-sm font-medium text-gray-700">
          Already have an account? <a href="/login" className="text-blue-500 hover:underline">Sign in</a>
        </div>     
        </div>
    </div>
  );
};

export default RegisterPage;