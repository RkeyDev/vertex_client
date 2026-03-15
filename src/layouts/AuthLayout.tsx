import React, { type ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
}

/**
 * AuthLayout provides the consistent visual frame for Login/Register.
 * It handles the gradient background and the centered glassmorphism/card effect.
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title = "Vertex" }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-blue-200 to-gray-400 p-4">
      {/* The main white/gray card container */}
      <div className="bg-[#E0E0E0] w-full max-w-2xl rounded-2xl shadow-2xl p-8 md:p-12 transition-all duration-300 ease-in-out">
        
        {/* Branding Header */}
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-5xl font-black text-gray-800 tracking-tight">
            {title}
          </h1>
          <div className="h-1 w-20 bg-gray-800 mt-2 rounded-full hidden md:block"></div>
        </header>

        {/* Dynamic Content (RegisterForm or LoginForm) */}
        <main>
          {children}
        </main>

        {/* Optional Footer (e.g., Copyright or Links) */}
        <footer className="mt-8 pt-6 border-t border-gray-300 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Vertex System Design. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default AuthLayout;