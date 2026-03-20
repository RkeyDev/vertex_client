import { useState, useCallback } from 'react';

export interface HistoryState<T> {
  canvasState: T;
  undo: () => void;
  redo: () => void;
  takeSnapshot: (newState: T) => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useHistory<T>(initialState: T): HistoryState<T> {
  const [canvasState, setCanvasState] = useState<T>(initialState);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);

  const takeSnapshot = useCallback((newState: T) => {
    // Push current state to past before updating to the new state
    setPast((prev) => [...prev, canvasState]);
    setCanvasState(newState);
    setFuture([]); // New actions clear the redo stack
  }, [canvasState]);

  const undo = useCallback(() => {
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setFuture((prev) => [canvasState, ...prev]);
    setPast(newPast);
    setCanvasState(previous);
  }, [past, canvasState]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast((prev) => [...prev, canvasState]);
    setFuture(newFuture);
    setCanvasState(next);
  }, [future, canvasState]);

  return {
    canvasState,
    undo,
    redo,
    takeSnapshot,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}