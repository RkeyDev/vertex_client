import React, { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col w-full">
        <label className="text-sm font-bold text-gray-800 mb-1">{label}</label>
        <input
          ref={ref}
          {...props}
          className={`p-2.5 rounded border-2 bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all ${
            error ? 'border-red-400' : 'border-blue-300'
          } ${className}`}
        />
        {error && <span className="text-red-500 text-xs mt-1 font-medium">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;