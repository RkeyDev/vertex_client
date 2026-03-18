import React from 'react';
import {type UmlComponent } from '../types/board.types';

interface PropertiesPanelProps {
  selectedComponent: UmlComponent | undefined;
  onUpdate: (updates: Partial<UmlComponent>) => void;
  onClose: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedComponent, onUpdate, onClose }) => {
  if (!selectedComponent) return null;

  return (
    <aside className="absolute right-0 top-20 bottom-0 w-80 bg-[#EAEAEA] border-l border-gray-400 p-6 shadow-2xl z-20 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-[#333]">Properties</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-red-500 text-xl">✕</button>
      </div>

      <div className="space-y-6 overflow-y-auto pr-2">
        <div>
          <label className="block text-sm font-bold text-gray-600 uppercase mb-2">Content</label>
          <input 
            type="text"
            className="w-full p-2 border-2 border-gray-400 rounded focus:border-blue-500 outline-none font-bold"
            value={selectedComponent.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
          />
        </div>

        <section>
          <h3 className="text-xs font-black text-blue-600 uppercase mb-4 tracking-widest">Dimensions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Width</label>
              <input 
                type="number"
                className="w-full p-2 border-2 border-gray-400 rounded"
                value={selectedComponent.width}
                onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Height</label>
              <input 
                type="number"
                className="w-full p-2 border-2 border-gray-400 rounded"
                value={selectedComponent.height}
                onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </section>
        <section>
          <h3 className="text-xs font-black text-blue-600 uppercase mb-4 tracking-widest">Positions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">X</label>
              <input 
                type="number"
                className="w-full p-2 border-2 border-gray-400 rounded"
                value={selectedComponent.xPox}
                onChange={(e) => onUpdate({ xPox: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Y</label>
              <input 
                type="number"
                className="w-full p-2 border-2 border-gray-400 rounded"
                value={selectedComponent.yPos}
                onChange={(e) => onUpdate({ yPos: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
};

export default PropertiesPanel;