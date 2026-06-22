import { type RoomProfileItem } from '../hooks/useCursorSocket';

export interface PendingDownload {
  clientKey:  string;
  requestId:  string | null;
  boardId:    string;
  fileType:   string;
}

export interface BoardLocationState {
  cursorProfiles?: Record<string, string> | RoomProfileItem[];
  cursorId?: number;
}
