export const ComponentType = {
  CLASS: 'CLASS',
  SERVER: 'SERVER',
  DATABASE: 'DATABASE',
} as const;

export type ComponentType = (typeof ComponentType)[keyof typeof ComponentType];

export type PortPosition = 'top' | 'right' | 'bottom' | 'left';

export interface UmlComponent {
  id?: string;
  xPox: number; 
  yPos: number; 
  width: number; 
  height: number; 
  type: ComponentType; 
  content: string; 
}

export interface UmlArrow {
  id: string;
  fromId: string | null;
  fromPort?: PortPosition;
  fromCoords?: { x: number, y: number };

  toId: string | null;
  toPort?: PortPosition;
  toCoords?: { x: number, y: number };

  controlPoint?: { x: number; y: number } | null;
  type: 'SOLID' | 'DASHED';
  headType: 'ARROW' | 'TRIANGLE' | 'NONE';
}

export interface DraftConnection {
  startNodeId: string;
  startPort: PortPosition;
  currentX: number;
  currentY: number;
}

// Added this interface for internal hit-test metadata
export interface PortMetadata {
  nodeId: string;
  port: PortPosition;
}