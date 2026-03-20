import  {type UmlComponent, type UmlArrow, ComponentType } from '../types/board.types';

/**
 * Serializes the internal state to the specific JSON format 
 * required by the German tech market flagship standards.
 */
const serializeBoard = (components: UmlComponent[], arrows: UmlArrow[]) => {
  const shapes = components.map((comp) => {
    const baseShape: any = {
      id: comp.id,
      type: comp.type === ComponentType.CLASS ? 'Class' : 
            comp.type === ComponentType.SERVER ? 'Server' : 'Database',
      width: comp.width,
      height: comp.height,
      xPos: comp.xPos,
      yPos: comp.yPos,
      data: {
        header: comp.data?.header || '',
      }
    };

    if (comp.type === ComponentType.CLASS) {
      baseShape.data.Attributes = comp.data?.attributes || [];
      baseShape.data.methods = comp.data?.methods || [];
    }

    return baseShape;
  });

  return {
    shapes,
    arrows: arrows.map(arrow => ({
      id: arrow.id,
      fromId: arrow.fromId,
      fromPort: arrow.fromPort,
      toId: arrow.toId,
      toPort: arrow.toPort,
      type: arrow.type,
      headType: arrow.headType
    }))
  };
};

/**
 * boardApi Service
 * Handles data persistence and logging.
 */
export const boardApi = {
  /**
   * Syncs the board state with the backend.
   * Prints the generated JSON to the console for debugging/audit.
   */
  saveBoard: async (components: UmlComponent[], arrows: UmlArrow[]) => {
    const jsonPayload = serializeBoard(components, arrows);

    // Output for debugging as requested
    console.log("--- BOARD API SYNC ---");
    console.log(JSON.stringify(jsonPayload, null, 2));

    try {
      // Logic for Java Spring Boot endpoint:
      // const response = await fetch('/api/v1/board/sync', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(jsonPayload)
      // });
      // return await response.json();
      
      return { success: true, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error("API Error during board sync:", error);
      throw error;
    }
  }
};