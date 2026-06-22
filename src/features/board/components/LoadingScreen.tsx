import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#1a1a1a] text-white">
      <div className="flex flex-col items-center gap-6">
        <div className="w-14 h-14 border-4 border-[#2a2a2a] border-t-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-xl font-semibold text-gray-200 tracking-wide">Connecting to Workspace</h2>
          <p className="text-sm text-gray-500 animate-pulse">Synchronizing board state...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
