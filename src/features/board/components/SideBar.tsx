import React from 'react';
import { ComponentType } from '../types/board.types';

interface SidebarProps {
  onAddComponent: (type: ComponentType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onAddComponent }) => {
  return (
    <aside className="w-64 bg-[#EAEAEA] border-r border-gray-400 flex flex-col p-4 shadow-xl z-10">
      <h1 className="text-5xl font-black text-[#333] mb-12">Vertex</h1>
      
      <section className="mb-12">
        <h2 className="text-4xl font-bold text-[#333] mb-4">UML</h2>
        <div className="grid grid-cols-4 gap-2">
          {[...Array(24)].map((_, i) => (
            <button 
              key={`uml-${i}`} 
              onClick={() => onAddComponent(ComponentType.CLASS)}
              className="aspect-square bg-white border border-gray-400 rounded-md shadow-sm hover:bg-blue-50 transition-all active:scale-95" 
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-4xl font-bold text-[#333] mb-4">Server</h2>
        <div className="grid grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => (
            <button 
              key={`srv-${i}`} 
              onClick={() => onAddComponent(ComponentType.SERVER)}
              className="aspect-square bg-white border border-blue-400 rounded-md shadow-sm hover:bg-blue-50 transition-all active:scale-95" 
            />
          ))}
        </div>
      </section>

      <div className="mt-auto p-4">
        <div className="w-16 h-16 bg-[#2C3E50] rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
          RK
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;