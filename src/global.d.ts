interface Window {
  boardController?: {
    setCamera: (camera: { x: number; y: number; zoom: number }) => void;
  };
}