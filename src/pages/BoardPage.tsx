import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stage, Layer, Rect, Group, Text } from 'react-konva';
import { type KonvaEventObject } from 'konva/lib/Node';

interface UMLComponent {
  id: string;
  x: number;
  y: number;
  type: string;
}

const BoardPage: React.FC = () => {
  const navigate = useNavigate();
  const [components, setComponents] = useState<UMLComponent[]>([]);
  const [gridImage, setGridImage] = useState<HTMLImageElement | undefined>(undefined);
  
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [stageSize, setStageSize] = useState({
    width: window.innerWidth - 256, 
    height: window.innerHeight - 80,
  });

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

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 40; 
    canvas.width = size;
    canvas.height = size;

    if (ctx) {
      ctx.strokeStyle = '#cbd5e1'; 
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

  const addComponent = (type: string) => {
    // Adjust spawn coordinates based on current scale and pan to ensure it centers in the viewport
    const newComp: UMLComponent = {
      id: Date.now().toString(),
      x: (-stagePos.x + stageSize.width / 2) / stageScale - 75,
      y: (-stagePos.y + stageSize.height / 2) / stageScale - 50,
      type: type,
    };
    setComponents((prev) => [...prev, newComp]);
  };

  const handleStageDrag = useCallback((e: KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage()) {
      setStagePos({ x: e.target.x(), y: e.target.y() });
    }
  }, []);

  // Pointer-centric zoom implementation
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const scaleBy = 1.1;
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Calculate pointer position relative to the stage's unscaled coordinates
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Clamp zoom to prevent rendering artifacts or coordinate float limits
    const clampedScale = Math.max(0.1, Math.min(newScale, 5));

    setStageScale(clampedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }, []);

  const handleComponentDragEnd = useCallback((e: KonvaEventObject<DragEvent>, id: string) => {
    setComponents((prev) => 
      prev.map(c => c.id === id ? { ...c, x: e.target.x(), y: e.target.y() } : c)
    );
  }, []);

  return (
    <div className="flex h-screen w-screen bg-[#333] overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#EAEAEA] border-r border-gray-400 flex flex-col p-4 shadow-xl z-10">
        <h1 className="text-5xl font-black text-[#333] mb-12">Vertex</h1>
        
        <section className="mb-12">
          <h2 className="text-4xl font-bold text-[#333] mb-4">UML</h2>
          <div className="grid grid-cols-4 gap-2">
            {[...Array(24)].map((_, i) => (
              <button 
                key={`uml-${i}`} 
                onClick={() => addComponent('Class')}
                className="aspect-square bg-white border border-blue-400 rounded-md shadow-sm hover:bg-blue-50 transition-all active:scale-95" 
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
                onClick={() => addComponent('Server')}
                className="aspect-square bg-white border border-blue-400 rounded-md shadow-sm hover:bg-blue-50 transition-all active:scale-95" 
              />
            ))}
          </div>
        </section>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col relative">
        {/* HEADER BAR */}
        <header className="h-20 bg-[#EAEAEA] border-b border-gray-400 flex items-center px-6 space-x-4 shadow-md z-10">
          <button className="bg-white border-2 border-gray-400 rounded px-6 py-1 text-2xl font-bold hover:bg-gray-100 transition-colors">Invite</button>
          <button className="bg-white border-2 border-gray-400 rounded px-6 py-1 text-2xl font-bold hover:bg-gray-100 transition-colors">Export</button>
          
          <div className="flex-1 flex justify-center px-10">
            <input className="bg-white border-2 border-gray-400 rounded w-full max-w-xl text-center py-1 text-2xl font-bold" type='text' defaultValue="Untitled"/>
          </div>

          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-white border-2 border-gray-400 rounded px-6 py-1 text-2xl font-bold hover:bg-gray-200 transition-colors"
          >
            Quit
          </button>
        </header>

        {/* INFINITE CANVAS */}
        <div className="flex-1 bg-white cursor-move">
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
            <Layer listening={false}>
              {gridImage && (
                <Rect
                  // Normalize the grid rect against the current scale so it always fills the visible viewport
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

            <Layer>
              {components.map((comp) => (
                <Group
                  key={comp.id}
                  x={comp.x}
                  y={comp.y}
                  draggable
                  onDragEnd={(e) => handleComponentDragEnd(e, comp.id)}
                >
                  <Rect
                    width={150}
                    height={100}
                    fill="white"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    cornerRadius={4}
                    shadowBlur={5}
                    shadowOpacity={0.1}
                    perfectDrawEnabled={false}
                    shadowForStrokeEnabled={false}
                  />
                  <Text
                    text={comp.type}
                    width={150}
                    height={100}
                    verticalAlign="middle"
                    align="center"
                    fontSize={18}
                    fontStyle="bold"
                    fill="#333"
                    perfectDrawEnabled={false}
                  />
                </Group>
              ))}
            </Layer>
          </Stage>
        </div>
      </main>
    </div>
  );
};

export default BoardPage;