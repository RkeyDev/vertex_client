// Define as a const object for runtime values
export const ComponentType = {
  CLASS: 'CLASS',
  SERVER: 'SERVER',
  DATABASE: 'DATABASE',
} as const;

// Create a type from the object values for your TypeScript interfaces
export type ComponentType = (typeof ComponentType)[keyof typeof ComponentType];

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
  fromId: string;
  toId: string;
  label?: string;
  type: 'SOLID' | 'DASHED';
  headType: 'ARROW' | 'TRIANGLE' | 'NONE';
}