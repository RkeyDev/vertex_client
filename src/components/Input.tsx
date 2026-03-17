import React, { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hasHelp?: boolean; // New prop for the ? icon
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hasHelp, className, type, ...props }, ref) => {
    return (
      <div className="flex flex-col w-full">
        {/* Label and Tooltip Wrapper */}
        <div className="flex items-center space-x-2 mb-1 relative">
          <label className="text-xl font-bold text-gray-800">{label}</label>
          
          {hasHelp && (
            <div className="group relative flex items-center">
              {/* The Help Icon */}
              <div className="w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center text-[12px] font-bold cursor-help transition-colors hover:bg-black">
                ?
              </div>
              
              {/* Tooltip Box */}
              <div className="invisible group-hover:visible absolute left-7 top-[-20px] z-50 w-80 p-4 bg-[#F3F4F6] border border-gray-400 rounded-xl shadow-2xl transition-all duration-200 opacity-0 group-hover:opacity-100">
                <ul className="text-[13px] text-gray-900 space-y-1.5 list-disc list-inside font-bold">
                  <li>Must be at least 8 characters long</li>
                  <li>Must include one lower case letter</li>
                  <li>Must include one upper case letter</li>
                  <li>Must include numbers</li>
                  <li>Must include a special character (e.g !@#$%.?)</li>
                </ul>
                
                {/* Arrow pointing to the ? */}
                <div className="absolute left-[-6px] top-3 w-3 h-3 bg-[#F3F4F6] border-l border-b border-gray-400 rotate-45"></div>
              </div>
            </div>
          )}
        </div>

        <input
          ref={ref}
          type={type}
          {...props}
          className={`p-2.5 rounded border-2 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all ${
            error ? 'border-red-400' : 'border-gray-300'
          } ${className} hover:border-gray-400`}
        />
        
        {error && (
          <span className="text-red-500 text-xs mt-1 font-medium">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;