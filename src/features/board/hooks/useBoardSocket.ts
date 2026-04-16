import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client, type StompSubscription } from '@stomp/stompjs';
import type { UmlArrow, UmlComponent } from '../types/board.types';

export interface BoardState {
  components: UmlComponent[];
  arrows: UmlArrow[];
}

interface BoardStateDTO {
  senderId: string;
  boardStateJson: string;
}

interface DebouncedPublisher {
  (payload: string): void;
  cancel?: () => void;
  flush?: () => void;
}

interface UseBoardSocketProps {
  boardToken: string | null;
  onStateReceived: (state: BoardState) => void;
}

const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8080/ws';

export const useBoardSocket = ({ boardToken, onStateReceived }: UseBoardSocketProps) => {
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const pendingPayloadRef = useRef<string | null>(null);
  const debouncedPublishRef = useRef<DebouncedPublisher | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  console.log('[useBoardSocket] Initialized with sessionId:', sessionId);

  const publishPayload = useCallback(
    (payload: string) => {
      const client = clientRef.current;
      console.log('[publishPayload] Called. Client connected:', client?.connected, 'boardToken:', !!boardToken);

      if (!client?.connected || !boardToken) {
        console.log('[publishPayload] Client not ready, storing pending payload');
        pendingPayloadRef.current = payload;
        return;
      }

      console.log('[publishPayload] Publishing to /app/board/' + boardToken + '/sync');
      client.publish({
        destination: `/app/board/${boardToken}/sync`,
        body: payload,
      });
      pendingPayloadRef.current = null;
    },
    [boardToken]
  );

  useEffect(() => {
    if (!boardToken) {
      console.warn('[useBoardSocket] No board token, skipping connection');
      return undefined;
    }

    console.log('[useBoardSocket] Creating STOMP client for board:', boardToken);
    const client = new Client({
      brokerURL: DEFAULT_WS_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log('[STOMP] Connected! Subscribing to /topic/board/' + boardToken);
        setIsConnected(true);

        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = client.subscribe(
          `/topic/board/${boardToken}`,
          (message) => {
            try {
              const dto = JSON.parse(message.body) as BoardStateDTO;
              if (!dto || typeof dto.senderId !== 'string' || typeof dto.boardStateJson !== 'string') {
                throw new Error('Received invalid board DTO');
              }

              if (dto.senderId === sessionId) {
                console.log('[STOMP] Suppressing echo from own session');
                return;
              }

              const parsed = JSON.parse(dto.boardStateJson) as unknown;
              if (!parsed || typeof parsed !== 'object') {
                throw new Error('boardStateJson did not parse to an object');
              }

              const remoteState = {
                components: Array.isArray((parsed as any).components) ? (parsed as any).components : [],
                arrows: Array.isArray((parsed as any).arrows) ? (parsed as any).arrows : [],
              };

              console.log('[STOMP] Received remote update:', remoteState);
              onStateReceived(remoteState);
            } catch (error) {
              console.error('[STOMP] Failed to parse remote board update:', error);
            }
          }
        );

        if (pendingPayloadRef.current) {
          console.log('[STOMP] Connected: flushing pending payload');
          if (debouncedPublishRef.current?.flush) {
            debouncedPublishRef.current.flush();
          } else {
            console.log('[STOMP] Debounce not ready, publishing pending payload directly');
            publishPayload(pendingPayloadRef.current);
          }
        }
      },

      onStompError: (frame) => {
        console.error('[STOMP] Broker reported error:', frame.headers['message']);
        console.error('[STOMP] Additional details:', frame.body);
      },

      onDisconnect: () => {
        console.log('[STOMP] Disconnected');
        setIsConnected(false);
      },

      onWebSocketError: (event) => {
        if (event instanceof ErrorEvent) {
          console.error('[WebSocket] Transport error:', event.message, event.error);
        } else if (event instanceof CloseEvent) {
          console.warn('[WebSocket] Connection closed:', event.code, event.reason);
        } else {
          console.debug('[WebSocket] Transport event:', event.type || event.constructor.name || event);
        }

        setIsConnected(false);
      },
    });

    clientRef.current = client;
    console.log('[useBoardSocket] Activating STOMP client');
    client.activate();

    return () => {
      console.log('[useBoardSocket] Cleaning up STOMP client');
      debouncedPublishRef.current?.cancel?.();
      debouncedPublishRef.current = null;
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      client.deactivate();
      clientRef.current = null;
      setIsConnected(false);
      pendingPayloadRef.current = null;
    };
  }, [boardToken, onStateReceived, sessionId, publishPayload]);

  useEffect(() => {
    if (!boardToken) {
      return undefined;
    }

    let active = true;

    console.log('[useBoardSocket] Loading debounce module...');
    import('lodash.debounce')
      .then((mod) => {
        if (!active) {
          console.log('[useBoardSocket] Debounce module loaded but effect was cleaned up');
          return;
        }

        console.log('[useBoardSocket] Debounce module loaded successfully');
        const debounceFn = (mod.default ?? mod) as (
          fn: (payload: string) => void,
          wait: number
        ) => ((payload: string) => void) & { cancel?: () => void; flush?: () => void };

        debouncedPublishRef.current = debounceFn((payload: string) => {
          console.log('[debounce] Publishing debounced payload');
          publishPayload(payload);
        }, 100);

        if (pendingPayloadRef.current) {
          console.log('[useBoardSocket] Debounce loaded, sending pending payload');
          debouncedPublishRef.current(pendingPayloadRef.current);
        }
      })
      .catch((error) => {
        console.error('[WebSocket] Failed to initialize debounce:', error);
      });

    return () => {
      active = false;
      debouncedPublishRef.current?.cancel?.();
      debouncedPublishRef.current = null;
    };
  }, [boardToken, publishPayload]);

  const sendUpdate = useCallback(
    (components: UmlComponent[], arrows: UmlArrow[]) => {
      if (!boardToken) {
        console.warn('useBoardSocket: cannot send update without board token');
        return;
      }

      const payload = JSON.stringify({
        senderId: sessionId,
        boardStateJson: JSON.stringify({ components, arrows }),
      });

      console.log('[sendUpdate] Called with', components.length, 'components and', arrows.length, 'arrows');
      console.log('[sendUpdate] Debounced fn ready:', !!debouncedPublishRef.current);

      pendingPayloadRef.current = payload;

      if (debouncedPublishRef.current) {
        console.log('[sendUpdate] Using debounced publish');
        debouncedPublishRef.current(payload);
      } else {
        console.log('[sendUpdate] Debounce not ready, calling publishPayload directly');
        publishPayload(payload);
      }
    },
    [boardToken, publishPayload, sessionId]
  );

  return {
    sessionId,
    isConnected,
    sendUpdate,
  };
};
