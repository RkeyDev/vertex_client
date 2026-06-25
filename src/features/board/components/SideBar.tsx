import React from 'react';
import { Square, Server, Database, Circle, User, CircleDashed } from 'lucide-react';

interface SidebarProps {
  onAddComponent: (type: string) => void;
  username?: string;
  avatarUrl?: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ onAddComponent, username, avatarUrl }) => {
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : '??';

  return (
    <aside className="w-64 bg-[#EAEAEA] border-r border-gray-400 flex flex-col p-4 shadow-xl z-10">
      <h1 className="text-5xl font-black text-[#333] mb-12">Vertex</h1>
      
      <section className="mb-12">
        <h2 className="text-4xl font-bold text-[#333] mb-4">Shapes</h2>
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => onAddComponent('CLASS')}
            className="flex flex-col items-center justify-center p-2 bg-white border border-gray-400 rounded-md shadow-sm hover:bg-blue-50 transition-all active:scale-95"
            title="Class"
          >
            <Square size={32} strokeWidth={1.5} className="text-gray-700 mb-1" />
            <span className="text-xs text-gray-600">Class</span>
          </button>
          
          <button 
            onClick={() => onAddComponent('INTERFACE')}
            className="flex flex-col items-center justify-center p-2 bg-white border border-gray-400 rounded-md shadow-sm hover:bg-blue-50 transition-all active:scale-95"
            title="Interface"
          >
            <CircleDashed size={32} strokeWidth={1.5} className="text-gray-700 mb-1" />
            <span className="text-xs text-gray-600">Interface</span>
          </button>

          <button 
            onClick={() => onAddComponent('USE_CASE')}
            className="flex flex-col items-center justify-center p-2 bg-white border border-gray-400 rounded-md shadow-sm hover:bg-blue-50 transition-all active:scale-95"
            title="Use Case"
          >
            <Circle size={32} strokeWidth={1.5} className="text-gray-700 mb-1" />
            <span className="text-xs text-gray-600">Use Case</span>
          </button>

          <button 
            onClick={() => onAddComponent('ACTOR')}
            className="flex flex-col items-center justify-center p-2 bg-white border border-gray-400 rounded-md shadow-sm hover:bg-blue-50 transition-all active:scale-95"
            title="Actor"
          >
            <User size={32} strokeWidth={1.5} className="text-gray-700 mb-1" />
            <span className="text-xs text-gray-600">Actor</span>
          </button>

          <button 
            onClick={() => onAddComponent('SERVER')}
            className="flex flex-col items-center justify-center p-2 bg-white border border-gray-400 rounded-md shadow-sm hover:bg-blue-50 transition-all active:scale-95"
            title="Server"
          >
            <Server size={32} strokeWidth={1.5} className="text-gray-700 mb-1" />
            <span className="text-xs text-gray-600">Server</span>
          </button>

          <button 
            onClick={() => onAddComponent('DATABASE')}
            className="flex flex-col items-center justify-center p-2 bg-white border border-gray-400 rounded-md shadow-sm hover:bg-blue-50 transition-all active:scale-95"
            title="Database"
          >
            <Database size={32} strokeWidth={1.5} className="text-gray-700 mb-1" />
            <span className="text-xs text-gray-600">Database</span>
          </button>
        </div>
      </section>

      <div className="mt-auto p-3 flex items-center gap-3 bg-white border border-gray-300 rounded-xl shadow-sm">
        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-300 ring-offset-2 ring-offset-white shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username ?? 'User avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#2C3E50] flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
          )}
        </div>
        <span className="text-sm font-medium text-[#333] truncate">
          {username ?? 'Anonymous'}
        </span>
      </div>
    </aside>
  );
};

export default Sidebar;