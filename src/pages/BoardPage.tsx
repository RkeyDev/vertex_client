import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { type KonvaEventObject } from 'konva/lib/Node';

import Sidebar from '../features/board/components/SideBar';
import TopBar from '../features/board/components/TopBar';
import PropertiesPanel from '../features/board/components/PropertiesPanel';
import Board from '../features/board/components//Board';

import { ComponentType, type UmlComponent } from '../features/board/types/board.types';

const BoardPage: React.FC = () => {
  const [components, setComponents] = useState<UmlComponent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [stageSize, setStageSize] = useState({
    width: window.innerWidth - 256,
    height: window.innerHeight - 80,
  });

  const selectedComponent = useMemo(() => 
    components.find((c) => c.id === selectedId), 
    [components, selectedId]
  );

  const addComponent = useCallback((type: ComponentType) => {
    const newComp: UmlComponent = {
      id: `temp-${Date.now()}`,
      xPox: Math.round((-stagePos.x + stageSize.width / 2) / stageScale - 75),
      yPos: Math.round((-stagePos.y + stageSize.height / 2) / stageScale - 50),
      width: 150,
      height: 100,
      type: type,
      content: "New "+ type.toLowerCase().charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
    };
    setComponents((prev) => [...prev, newComp]);
  }, [stagePos, stageScale, stageSize]);

  const handleStageDrag = useCallback((e: KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage()) {
      setStagePos({ x: e.target.x(), y: e.target.y() });
    }
  }, []);

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

  const handleComponentDragEnd = useCallback((e: KonvaEventObject<DragEvent>, id: string) => {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, xPox: Math.round(e.target.x()), yPos: Math.round(e.target.y()) }
          : c
      )
    );
  }, []);

  const handleUpdateComponent = useCallback((updates: Partial<UmlComponent>) => {
    if (!selectedId) return;
    setComponents((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, ...updates } : c))
    );
  }, [selectedId]);

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

  return (
    <div className="flex h-screen w-screen bg-[#333] overflow-hidden font-sans select-none">
      <Sidebar onAddComponent={addComponent} />
      <main className="flex-1 flex flex-col relative">
        <TopBar />
        <Board
          components={components}
          selectedId={selectedId}
          stageSize={stageSize}
          stagePos={stagePos}
          stageScale={stageScale}
          onStageDrag={handleStageDrag}
          onWheel={handleWheel}
          onSelect={setSelectedId}
          onDragEnd={handleComponentDragEnd}
        />
        <PropertiesPanel
          selectedComponent={selectedComponent}
          onUpdate={handleUpdateComponent}
          onClose={() => setSelectedId(null)}
        />
      </main>
    </div>
  );
};

export default BoardPage;