import React from 'react';
import LoginForm from '../features/auth/components/LoginForm';

const LoginPage: React.FC = () => {
  return (
    <div className="vertex-auth-screen flex items-center justify-center min-h-screen">
      <div className="bg-[#EAEAEA] p-10 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col items-center relative min-h-[700px]">
        
        <h1 className="text-6xl font-black mb-4 text-[#333] self-start ml-4">Vertex</h1>
        
        <div className="flex-1 flex flex-col justify-center w-full px-8 pb-16">
          <h2 className="text-4xl font-bold mb-10 text-[#222] text-center">Login Now!</h2>
          <LoginForm />
        </div>

        {/* Standardized Footer Position */}
        <div className="absolute bottom-6 right-8 text-sm font-bold text-gray-800">
          Don't have an account yet? <a href="/register" className="text-blue-500 hover:underline">Sign up</a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;