import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client, type StompSubscription } from '@stomp/stompjs';
import type { UmlArrow, UmlComponent } from '../types/board.types';

export interface BoardState {
  components: UmlComponent[];
  arrows: UmlArrow[];
}

export interface BoardTransform {
  componentId: string;
  xPos: number;
  yPos: number;
  width?: number;
  height?: number;
  senderId: string;
}

interface BoardStateDTO {
  senderId: string;
  boardStateJson: string;
}

interface UseBoardSocketProps {
  boardToken: string | null;
  onStateReceived: (state: BoardState) => void;
  onTransformReceived: (transform: BoardTransform) => void;
}

const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:9080/ws';
const TRANSFORM_THROTTLE_MS = 33;

function getAuthToken(): string {
  try {
    return localStorage.getItem('vertex_access_token') ?? '';
  } catch {
    return '';
  }
}

export const useBoardSocket = ({
  boardToken,
  onStateReceived,
  onTransformReceived,
}: UseBoardSocketProps) => {
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const clientRef = useRef<Client | null>(null);
  const syncSubscriptionRef = useRef<StompSubscription | null>(null);
  const transformSubscriptionRef = useRef<StompSubscription | null>(null);
  const pendingSyncPayloadRef = useRef<string | null>(null);
  const lastTransformSendRef = useRef<number>(0);
  const pendingTransformRef = useRef<BoardTransform | null>(null);
  const transformThrottleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const isReadyRef = useRef(isReady);
  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  const onStateReceivedRef = useRef(onStateReceived);
  const onTransformReceivedRef = useRef(onTransformReceived);
  useEffect(() => {
    onStateReceivedRef.current = onStateReceived;
  }, [onStateReceived]);
  useEffect(() => {
    onTransformReceivedRef.current = onTransformReceived;
  }, [onTransformReceived]);

  const publishSyncPayload = useCallback(
    (payload: string) => {
      const client = clientRef.current;
      if (!client?.connected || !boardToken) {
        pendingSyncPayloadRef.current = payload;
        return;
      }
      client.publish({
        destination: `/app/board/${boardToken}/sync`,
        body: payload,
      });
      pendingSyncPayloadRef.current = null;
    },
    [boardToken]
  );

  const publishTransformNow = useCallback((): boolean => {
    const client = clientRef.current;
    const transform = pendingTransformRef.current;
    if (!boardToken || !transform) return false;
    if (!client || (!client.connected && !client.active)) return false;

    try {
      client.publish({
        destination: `/app/board/${boardToken}/transform`,
        body: JSON.stringify(transform),
      });
      lastTransformSendRef.current = performance.now();
      pendingTransformRef.current = null;
      return true;
    } catch (error) {
      console.warn('[publishTransformNow] Failed:', error);
      return false;
    }
  }, [boardToken]);

  const scheduleTransformFlush = useCallback(() => {
    if (transformThrottleTimerRef.current) return;
    const elapsed = performance.now() - lastTransformSendRef.current;
    const delay = Math.max(0, TRANSFORM_THROTTLE_MS - elapsed);
    transformThrottleTimerRef.current = setTimeout(() => {
      transformThrottleTimerRef.current = null;
      const published = publishTransformNow();
      if (!published && pendingTransformRef.current) {
        scheduleTransformFlush();
      }
    }, delay);
  }, [publishTransformNow]);

  const sendTransform = useCallback(
    (transform: Omit<BoardTransform, 'senderId'>) => {
      if (!boardToken) return;
      pendingTransformRef.current = { ...transform, senderId: sessionId };
      if (!publishTransformNow()) {
        scheduleTransformFlush();
      }
    },
    [boardToken, sessionId, publishTransformNow, scheduleTransformFlush]
  );

  const flushTransform = useCallback(() => {
    if (transformThrottleTimerRef.current) {
      clearTimeout(transformThrottleTimerRef.current);
      transformThrottleTimerRef.current = null;
    }
    publishTransformNow();
  }, [publishTransformNow]);

  const sendFullSync = useCallback(
    (components: UmlComponent[], arrows: UmlArrow[]) => {
      if (!boardToken) return;
      const payload = JSON.stringify({
        senderId: sessionId,
        boardStateJson: JSON.stringify({ components, arrows }),
      });
      publishSyncPayload(payload);
    },
    [boardToken, publishSyncPayload, sessionId]
  );

  useEffect(() => {
    if (!boardToken) return undefined;

    const token = getAuthToken();

    const client = new Client({
      brokerURL: DEFAULT_WS_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      // ── Send JWT so Spring Security resolves the Principal correctly ──
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      onConnect: () => {
        setIsConnected(true);

        syncSubscriptionRef.current?.unsubscribe();
        syncSubscriptionRef.current = client.subscribe(
          `/topic/board/${boardToken}`,
          (message) => {
            try {
              const dto = JSON.parse(message.body) as BoardStateDTO;
              if (!dto || typeof dto.senderId !== 'string' || typeof dto.boardStateJson !== 'string') {
                throw new Error('Received invalid board DTO');
              }

              let isInitialSyncResponse = false;

              if (dto.senderId.startsWith('SERVER_INITIAL_SYNC_')) {
                if (dto.senderId !== `SERVER_INITIAL_SYNC_${sessionId}`) return;
                isInitialSyncResponse = true;
              } else if (dto.senderId === 'SERVER') {
                if (!isReadyRef.current) {
                  isInitialSyncResponse = true;
                } else {
                  return;
                }
              } else if (dto.senderId === sessionId) {
                return;
              }

              const parsed = JSON.parse(dto.boardStateJson) as unknown;
              if (!parsed || typeof parsed !== 'object') {
                throw new Error('boardStateJson did not parse to an object');
              }

              const remoteState = {
                components: Array.isArray((parsed as { components?: unknown }).components)
                  ? (parsed as { components: UmlComponent[] }).components
                  : [],
                arrows: Array.isArray((parsed as { arrows?: unknown }).arrows)
                  ? (parsed as { arrows: UmlArrow[] }).arrows
                  : [],
              };

              onStateReceivedRef.current(remoteState);

              if (isInitialSyncResponse) {
                setIsReady(true);
              }
            } catch (error) {
              console.error('[STOMP] Failed to parse remote board update:', error);
            }
          }
        );

        transformSubscriptionRef.current?.unsubscribe();
        transformSubscriptionRef.current = client.subscribe(
          `/topic/board/${boardToken}/transform`,
          (message) => {
            try {
              const raw = JSON.parse(message.body) as any;
              const transform: BoardTransform = {
                componentId: raw.componentId || raw.id,
                xPos:        raw.xPos ?? raw.xpos ?? raw.x,
                yPos:        raw.yPos ?? raw.ypos ?? raw.y,
                width:       raw.width,
                height:      raw.height,
                senderId:    raw.senderId,
              };

              if (
                !transform ||
                typeof transform.componentId !== 'string' ||
                typeof transform.xPos !== 'number' ||
                typeof transform.yPos !== 'number' ||
                typeof transform.senderId !== 'string'
              ) {
                throw new Error('Received invalid transform DTO');
              }

              if (transform.senderId === sessionId) return;

              onTransformReceivedRef.current(transform);
            } catch (error) {
              console.error('[STOMP] Failed to parse remote transform:', error);
            }
          }
        );

        // Request initial board state
        setTimeout(() => {
          if (client.connected) {
            client.publish({
              destination: `/app/board/${boardToken}/sync`,
              body: JSON.stringify({
                senderId: sessionId,
                boardStateJson: 'INITIAL_SYNC',
              }),
            });
          }
        }, 500);

        if (pendingSyncPayloadRef.current) {
          publishSyncPayload(pendingSyncPayloadRef.current);
        }
        if (pendingTransformRef.current) {
          if (!publishTransformNow()) {
            scheduleTransformFlush();
          }
        }
      },

      onStompError: (frame) => {
        console.error('[STOMP] Broker error:', frame.headers['message'], frame.body);
      },

      onDisconnect: () => {
        setIsConnected(false);
      },

      onWebSocketError: (event) => {
        if (event instanceof ErrorEvent) {
          console.error('[WebSocket] Transport error:', event.message);
        } else if (event instanceof CloseEvent) {
          console.warn('[WebSocket] Closed:', event.code, event.reason);
        }
        setIsConnected(false);
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      if (transformThrottleTimerRef.current) {
        clearTimeout(transformThrottleTimerRef.current);
        transformThrottleTimerRef.current = null;
      }
      syncSubscriptionRef.current?.unsubscribe();
      syncSubscriptionRef.current = null;
      transformSubscriptionRef.current?.unsubscribe();
      transformSubscriptionRef.current = null;
      client.deactivate();
      clientRef.current = null;
      setIsConnected(false);
      pendingSyncPayloadRef.current = null;
      pendingTransformRef.current = null;
    };
  }, [boardToken, sessionId, publishSyncPayload, publishTransformNow, scheduleTransformFlush]);

  return {
    sessionId,
    isConnected,
    isReady,
    sendTransform,
    flushTransform,
    sendFullSync,
    client: clientRef, 
  };
};