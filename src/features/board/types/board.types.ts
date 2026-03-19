export const ComponentType = {
  CLASS: 'CLASS',
  SERVER: 'SERVER',
  DATABASE: 'DATABASE',
} as const;

export type ComponentType = (typeof ComponentType)[keyof typeof ComponentType];

export type PortPosition = 'top' | 'right' | 'bottom' | 'left';

interface BaseComponent {
  id: string;
  xPox: number; 
  yPos: number;
  width: number;
  height: number;
}

export interface UmlClassComponent extends BaseComponent {
  type: typeof ComponentType.CLASS;
  data?: {
    header?: string;
    attributes?: string[];
    methods?: string[];
  };
}

export interface ServerComponent extends BaseComponent {
  type: typeof ComponentType.SERVER;
  data?: {
    header?: string;
  };
}

export interface DatabaseComponent extends BaseComponent {
  type: typeof ComponentType.DATABASE;
  data?: {
    header?: string;
  };
}

export type UmlComponent = UmlClassComponent | ServerComponent | DatabaseComponent;

export interface UmlArrow {
  id: string;
  
  // Connection Logic
  fromId: string | null;
  fromPort?: PortPosition;
  fromCoords?: { x: number; y: number }; // FIX: Added missing property

  toId: string | null;
  toPort?: PortPosition;
  toCoords?: { x: number; y: number };   // FIX: Added missing property

  // Visual/Curve Logic
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