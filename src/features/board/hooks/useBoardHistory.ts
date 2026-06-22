import { useState, useCallback } from 'react';
import { type UmlComponent, type UmlArrow } from '../types/board.types';

export const useBoardHistory = (initialState: { components: UmlComponent[]; arrows: UmlArrow[] }) => {
  const [state, setState]   = useState(initialState);
  const [past, setPast]     = useState<typeof initialState[]>([]);
  const [future, setFuture] = useState<typeof initialState[]>([]);

  const takeSnapshot = useCallback(() => {
    setPast(prev => [...prev, state]);
    setFuture([]);
  }, [state]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setFuture(prev => [state, ...prev]);
    setPast(past.slice(0, -1));
    setState(previous);
  }, [past, state]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setPast(prev => [...prev, state]);
    setFuture(future.slice(1));
    setState(next);
  }, [future, state]);

  return { state, setState, takeSnapshot, undo, redo };
};
