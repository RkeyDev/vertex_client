export const ComponentType = {
  CLASS: 'CLASS',
  SERVER: 'SERVER',
  DATABASE: 'DATABASE',
} as const;

export type ComponentType = (typeof ComponentType)[keyof typeof ComponentType];

export type PortPosition = 'top' | 'right' | 'bottom' | 'left';

export interface UmlComponent {
  id?: string;
  xPox: number; // Retaining your original property name
  yPos: number; 
  width: number; 
  height: number; 
  type: ComponentType; 
  content: string; 
}

export interface UmlArrow {
  id: string;
  fromId: string;
  fromPort: PortPosition;
  toId: string;
  toPort: PortPosition;
  label?: string;
  type: 'SOLID' | 'DASHED';
  headType: 'ARROW' | 'TRIANGLE' | 'NONE';
  // Custom control point for Bezier curves. If null, it defaults to a straight line.
  controlPoint?: { x: number; y: number } | null;
}

export interface DraftConnection {
  startNodeId: string;
  startPort: PortPosition;
  currentX: number;
  currentY: number;
}