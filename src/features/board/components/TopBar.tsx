import React from 'react';
import { useNavigate } from 'react-router-dom';

const TopBar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="h-20 bg-[#EAEAEA] border-b border-gray-400 flex items-center px-6 space-x-4 shadow-md z-10">
      <button className="bg-white border-2 border-gray-400 rounded px-6 py-1 text-2xl font-bold hover:bg-gray-100 shadow-sm transition-colors">Invite</button>
      <button className="bg-white border-2 border-gray-400 rounded px-6 py-1 text-2xl font-bold hover:bg-gray-100 shadow-sm transition-colors">Export</button>
      
      <div className="flex-1 flex justify-center px-10">
        <input 
          className="bg-white border-2 border-gray-400 rounded w-full max-w-xl text-center py-1 text-2xl font-bold focus:outline-none focus:border-blue-500 transition-colors" 
          type='text' 
          defaultValue="Untitled"
        />
      </div>

      <button 
        onClick={() => navigate('/dashboard')}
        className="bg-white border-2 border-gray-400 rounded px-6 py-1 text-2xl font-bold hover:bg-gray-200 shadow-sm transition-colors"
      >
        Quit
      </button>
    </header>
  );
};

export default TopBar;