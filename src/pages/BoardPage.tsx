import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stage, Layer, Rect, Group, Text } from 'react-konva';
import { type KonvaEventObject } from 'konva/lib/Node';
import { ComponentType, type UmlComponent } from '../features/board/types/board.types';

const BoardPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State for components and canvas transformation
  const [components, setComponents] = useState<UmlComponent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gridImage, setGridImage] = useState<HTMLImageElement | undefined>(undefined);
  
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [stageSize, setStageSize] = useState({
    width: window.innerWidth - 256, 
    height: window.innerHeight - 80,
  });

  // Handle Window Resize
  useEffect(() => {
    const handleResize = () => {
      setStageSize({
        width: window.innerWidth - 256,
        height: window.innerHeight - 80,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate Grid Pattern (Matches your blue grid design)
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 40; 
    canvas.width = size;
    canvas.height = size;

    if (ctx) {
      ctx.strokeStyle = '#1a6abe'; // Vertex Brand Blue
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(size, 0);
      ctx.moveTo(0, 0); ctx.lineTo(0, size);
      ctx.stroke();
    }

    const img = new Image();
    img.src = canvas.toDataURL();
    img.onload = () => setGridImage(img);
  }, []);

  // Add Component (Synchronized with Backend Entity structure)
  const addComponent = (type: ComponentType) => {
    const newComp: UmlComponent = {
      id: `temp-${Date.now()}`, // Temporary ID until saved to DB
      xPox: Math.round((-stagePos.x + stageSize.width / 2) / stageScale - 75),
      yPos: Math.round((-stagePos.y + stageSize.height / 2) / stageScale - 50),
      width: 150,
      height: 100,
      type: type,
      content: type === ComponentType.CLASS ? "New Class" : "New Server",
    };
    setComponents((prev) => [...prev, newComp]);
  };

  // Canvas Panning Logic
  const handleStageDrag = useCallback((e: KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage()) {
      setStagePos({ x: e.target.x(), y: e.target.y() });
    }
  }, []);

  // Pointer-Centric Zoom Logic
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.1, Math.min(newScale, 5));

    setStageScale(clampedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }, []);

  // Component Drag Logic (Updates xPox and yPos for Backend)
  const handleComponentDragEnd = useCallback((e: KonvaEventObject<DragEvent>, id: string) => {
    setComponents((prev) => 
      prev.map(c => c.id === id ? { 
        ...c, 
        xPox: Math.round(e.target.x()), 
        yPos: Math.round(e.target.y()) 
      } : c)
    );
  }, []);

  return (
    <div className="flex h-screen w-screen bg-[#333] overflow-hidden font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#EAEAEA] border-r border-gray-400 flex flex-col p-4 shadow-xl z-10">
        <h1 className="text-5xl font-black text-[#333] mb-12">Vertex</h1>
        
        <section className="mb-12">
          <h2 className="text-4xl font-bold text-[#333] mb-4">UML</h2>
          <div className="grid grid-cols-4 gap-2">
            {[...Array(24)].map((_, i) => (
              <button 
                key={`uml-${i}`} 
                onClick={() => addComponent(ComponentType.CLASS)}
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
                onClick={() => addComponent(ComponentType.SERVER)}
                className="aspect-square bg-white border border-blue-400 rounded-md shadow-sm hover:bg-blue-50 transition-all active:scale-95" 
              />
            ))}
          </div>
        </section>

        {/* User Profile Placeholder */}
        <div className="mt-auto p-4">
          <div className="w-16 h-16 bg-[#2C3E50] rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            RK
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col relative">
        {/* HEADER BAR */}
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

        {/* INFINITE CANVAS */}
        <div className="flex-1 bg-white cursor-crosshair">
          <Stage 
            width={stageSize.width} 
            height={stageSize.height} 
            draggable
            onDragMove={handleStageDrag}
            onWheel={handleWheel}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePos.x}
            y={stagePos.y}
          >
            {/* Grid Layer */}
            <Layer listening={false}>
              {gridImage && (
                <Rect
                  x={-stagePos.x / stageScale} 
                  y={-stagePos.y / stageScale}
                  width={stageSize.width / stageScale}
                  height={stageSize.height / stageScale}
                  fillPatternImage={gridImage}
                  fillPatternOffset={{ 
                    x: -stagePos.x / stageScale, 
                    y: -stagePos.y / stageScale 
                  }}
                  fillPatternRepeat="repeat"
                  perfectDrawEnabled={false}
                />
              )}
            </Layer>

            {/* Components Layer */}
            <Layer>
              {components.map((comp) => (
                <Group
                  key={comp.id}
                  x={comp.xPox}
                  y={comp.yPos}
                  draggable
                  onClick={() => setSelectedId(comp.id ?? null)}
                  onDragEnd={(e) => handleComponentDragEnd(e, comp.id!)}
                >
                  <Rect
                    width={comp.width}
                    height={comp.height}
                    fill="white"
                    stroke={selectedId === comp.id ? "#3b82f6" : "#303030"}
                    strokeWidth={selectedId === comp.id ? 3 : 2}
                    cornerRadius={4}
                    shadowBlur={5}
                    shadowOpacity={0.1}
                    perfectDrawEnabled={false}
                  />
                  <Text
                    text={comp.content}
                    width={comp.width}
                    height={comp.height}
                    verticalAlign="middle"
                    align="center"
                    fontSize={18}
                    fontStyle="bold"
                    fill="#333"
                  />
                </Group>
              ))}
            </Layer>
          </Stage>
        </div>
        {/* PROPERTY PANEL - Appears only when a component is selected */}
{selectedId && (
  <aside className="absolute right-0 top-20 bottom-0 w-80 bg-[#EAEAEA] border-l border-gray-400 p-6 shadow-2xl z-20 flex flex-col">
    <div className="flex justify-between items-center mb-8">
      <h2 className="text-3xl font-bold text-[#333]">Properties</h2>
      <button 
        onClick={() => setSelectedId(null)}
        className="text-gray-500 hover:text-red-500 text-xl"
      >
        ✕
      </button>
    </div>

    {components.find(c => c.id === selectedId) && (
      <div className="space-y-6">
        {/* Title / Content Input */}
        <div>
          <label className="block text-sm font-bold text-gray-600 uppercase mb-2">Content</label>
          <input 
            type="text"
            className="w-full p-2 border-2 border-gray-400 rounded focus:border-blue-500 outline-none font-bold"
            value={components.find(c => c.id === selectedId)?.content || ''}
            onChange={(e) => {
              setComponents(prev => prev.map(c => 
                c.id === selectedId ? { ...c, content: e.target.value } : c
              ));
            }}
          />
        </div>

        {/* Dimension Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 uppercase mb-2">Width</label>
            <input 
              type="number"
              className="w-full p-2 border-2 border-gray-400 rounded outline-none"
              value={components.find(c => c.id === selectedId)?.width || 0}
              onChange={(e) => {
                setComponents(prev => prev.map(c => 
                  c.id === selectedId ? { ...c, width: parseInt(e.target.value) || 0 } : c
                ));
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 uppercase mb-2">Height</label>
            <input 
              type="number"
              className="w-full p-2 border-2 border-gray-400 rounded outline-none"
              value={components.find(c => c.id === selectedId)?.height || 0}
              onChange={(e) => {
                setComponents(prev => prev.map(c => 
                  c.id === selectedId ? { ...c, height: parseInt(e.target.value) || 0 } : c
                ));
              }}
            />
          </div>
        </div>

        <div className="pt-8 border-t border-gray-300">
          <p className="text-xs text-gray-500 italic">
            Entity Type: {components.find(c => c.id === selectedId)?.type}
          </p>
          <p className="text-xs text-gray-500 italic">
            ID: {selectedId}
          </p>
        </div>
      </div>
    )}
  </aside>
)}
      </main>
    </div>
  );
};

export default BoardPage;