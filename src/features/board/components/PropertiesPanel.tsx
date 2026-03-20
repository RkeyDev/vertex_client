import React from 'react';
import { 
  type UmlComponent, 
  ComponentType 
} from '../types/board.types';

interface PropertiesPanelProps {
  selectedComponent: UmlComponent | undefined;
  onUpdate: (updates: Partial<UmlComponent>) => void;
  onClose: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedComponent, onUpdate, onClose }) => {
  if (!selectedComponent) return null;

  // --- Helper Functions ---

  const updateBaseField = (field: keyof UmlComponent, value: any) => {
    onUpdate({ [field]: value });
  };

  const updateDataField = (key: string, value: any) => {
    onUpdate({
      data: {
        ...selectedComponent.data,
        [key]: value,
      },
    } as Partial<UmlComponent>);
  };

  const handleArrayChange = (key: string, index: number, value: string) => {
    const currentArray = (selectedComponent.data as any)?.[key] || [];
    const newArray = [...currentArray];
    newArray[index] = value;
    updateDataField(key, newArray);
  };

  const addArrayItem = (key: string) => {
    const currentArray = (selectedComponent.data as any)?.[key] || [];
    updateDataField(key, [...currentArray, ""]);
  };

  const removeArrayItem = (key: string, index: number) => {
    const currentArray = (selectedComponent.data as any)?.[key] || [];
    updateDataField(key, currentArray.filter((_: any, i: number) => i !== index));
  };

  // --- Render Helpers ---

  const renderDataEditors = () => {
    const data = selectedComponent.data || {};
    
    return Object.entries(data).map(([key, value]) => {
      // Skip fontSize in the dynamic loop as we'll give it a dedicated UI section below
      if (key === 'fontSize') return null;

      if (Array.isArray(value)) {
        return (
          <section key={key} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black text-blue-600 uppercase tracking-widest">{key}</label>
              <button 
                onClick={() => addArrayItem(key)}
                className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600 transition-colors"
              >
                + Add
              </button>
            </div>
            <div className="space-y-1">
              {value.map((item, index) => (
                <div key={`${key}-${index}`} className="flex gap-2">
                  <input 
                    className="flex-1 p-1 text-sm border border-gray-300 rounded focus:border-blue-400 outline-none"
                    value={item}
                    onChange={(e) => handleArrayChange(key, index, e.target.value)}
                  />
                  <button 
                    onClick={() => removeArrayItem(key, index)} 
                    className="text-gray-400 hover:text-red-500 px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      }

      if (typeof value === 'string') {
        return (
          <div key={key}>
            <label className="block text-xs font-black text-blue-600 uppercase mb-2 tracking-widest">
              {key === 'header' ? 'Title' : key}
            </label>
            <input 
              type="text"
              className="w-full p-2 border-2 border-gray-400 rounded focus:border-blue-500 outline-none font-bold bg-white"
              value={value}
              onChange={(e) => updateDataField(key, e.target.value)}
            />
          </div>
        );
      }

      return null;
    });
  };

  return (
    <aside className="absolute right-0 top-20 bottom-0 w-80 bg-[#F3F4F6] border-l border-gray-300 p-6 shadow-xl z-20 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Properties</h2>
          <span className="text-[10px] px-2 py-0.5 bg-gray-200 rounded-full text-gray-600 font-mono uppercase">
            {selectedComponent.type}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-8">
        {/* Component Content (Title, Methods, etc.) */}
        <div className="space-y-6">
          {renderDataEditors()}
        </div>

        <hr className="border-gray-300" />

        {/* Typography Section */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Typography</h3>
          <div className="space-y-2">
             <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Font Size</label>
                <span className="text-xs font-mono text-blue-600 font-bold">
                    {(selectedComponent.data as any)?.fontSize || 14}px
                </span>
             </div>
             <input 
                type="range"
                min="8"
                max="72"
                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
                value={(selectedComponent.data as any)?.fontSize || 14}
                onChange={(e) => updateDataField('fontSize', parseInt(e.target.value))}
             />
             <div className="flex gap-2">
                <button 
                    onClick={() => updateDataField('fontSize', Math.max(8, ((selectedComponent.data as any)?.fontSize || 14) - 1))}
                    className="flex-1 bg-white border border-gray-300 text-gray-600 text-xs py-1 rounded hover:bg-gray-50"
                >
                    smaller
                </button>
                <button 
                    onClick={() => updateDataField('fontSize', Math.min(72, ((selectedComponent.data as any)?.fontSize || 14) + 1))}
                    className="flex-1 bg-white border border-gray-300 text-gray-600 text-xs py-1 rounded hover:bg-gray-50"
                >
                    larger
                </button>
             </div>
          </div>
        </section>

        <hr className="border-gray-300" />

        {/* Transform Properties */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Transform</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <LayoutInput 
              label="Width" 
              value={selectedComponent.width} 
              onChange={(val) => updateBaseField('width', val)} 
            />
            <LayoutInput 
              label="Height" 
              value={selectedComponent.height} 
              onChange={(val) => updateBaseField('height', val)} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <LayoutInput 
              label="X Pos" 
              value={selectedComponent.xPos} 
              onChange={(val) => updateBaseField('xPos', val)} 
            />
            <LayoutInput 
              label="Y Pos" 
              value={selectedComponent.yPos} 
              onChange={(val) => updateBaseField('yPos', val)} 
            />
          </div>
        </section>
      </div>
    </aside>
  );
};

const LayoutInput: React.FC<{ label: string; value: number; onChange: (val: number) => void }> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tighter">{label}</label>
    <input 
      type="number"
      className="w-full p-2 border border-gray-300 rounded bg-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
    />
  </div>
);

export default PropertiesPanel;