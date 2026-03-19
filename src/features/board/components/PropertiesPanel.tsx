import React from 'react';
import { 
  type UmlComponent, 
  type UmlClassComponent, 
  ComponentType 
} from '../types/board.types';

interface PropertiesPanelProps {
  selectedComponent: UmlComponent | undefined;
  onUpdate: (updates: Partial<UmlComponent>) => void;
  onClose: () => void;
}

/**
 * PropertiesPanel - Generic side panel for editing UML component properties.
 * Handles dynamic data fields (arrays, strings) and base layout properties.
 */
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
      // Handle Arrays (e.g., attributes, methods)
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

      // Handle Strings (e.g., header/title)
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

      //TODO Handle Booleans or simple Numbers inside 'data' if they exist later
      return null;
    });
  };

  return (
    <aside className="absolute right-0 top-20 bottom-0 w-80 bg-[#F3F4F6] border-l border-gray-300 p-6 shadow-xl z-20 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Properties</h2>
          <span className="text-[10px] px-2 py-0.5 bg-gray-200 rounded-full text-gray-600 font-mono">
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
        {/* Dynamic Component Data */}
        <div className="space-y-6">
          {renderDataEditors()}
        </div>

        <hr className="border-gray-300" />

        {/* Static Layout Properties */}
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
              value={selectedComponent.xPox} 
              onChange={(val) => updateBaseField('xPox', val)} 
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

/**
 * Reusable layout input sub-component
 */
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