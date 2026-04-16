import { Client, type StompSubscription } from '@stomp/stompjs';
import { type UmlComponent, type UmlArrow, ComponentType } from '../types/board.types';

// ─── Serializer ──────────────────────────────────────────────────────────────

const serializeBoard = (components: UmlComponent[], arrows: UmlArrow[]) => {
  const shapes = components.map((comp) => {
    const baseShape: any = {
      id: comp.id,
      type: comp.type === ComponentType.CLASS ? 'Class'
          : comp.type === ComponentType.SERVER ? 'Server' : 'Database',
      width: comp.width,
      height: comp.height,
      xPos: comp.xPos,
      yPos: comp.yPos,
      data: { header: comp.data?.header || '' },
    };

    if (comp.type === ComponentType.CLASS) {
      baseShape.data.attributes = comp.data?.attributes || [];
      baseShape.data.methods    = comp.data?.methods    || [];
    }

    return baseShape;
  });

  return {
    shapes,
    arrows: arrows.map(a => ({
      id:       a.id,
      fromId:   a.fromId,
      fromPort: a.fromPort,
      toId:     a.toId,
      toPort:   a.toPort,
      type:     a.type,
      headType: a.headType,
    })),
  };
};

// ─── Singleton STOMP client ───────────────────────────────────────────────────

class BoardWebSocketClient {
  private client: Client | null = null;
  private boardToken: string | null = null;
  private subscription: StompSubscription | null = null;
  private onRemoteUpdate: ((payload: any) => void) | null = null;
  private pendingPayload: string | null = null;

  connect(token: string, onRemoteUpdate: (payload: any) => void): Promise<void> {
    if (this.client?.connected && this.boardToken === token) return Promise.resolve();

    this.disconnect();
    this.boardToken = token;
    this.onRemoteUpdate = onRemoteUpdate;

    return new Promise((resolve, reject) => {
      // Use environment variable for the broker URL to support Docker/Production
      // Fallback uses 127.0.0.1 to avoid IPv6 resolution issues with 'localhost'
      const brokerUrl = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8080/ws';

      this.client = new Client({
        brokerURL: brokerUrl,
        reconnectDelay: 5000, // Standard reliability practice
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,

        onConnect: () => {
          this.subscription = this.client!.subscribe(
            `/topic/board/${token}`,
            (message) => {
              try {
                const data = JSON.parse(message.body);
                this.onRemoteUpdate?.(data);
              } catch (e) {
                console.error('[STOMP] Failed to parse remote board update:', e);
              }
            }
          );

          if (this.pendingPayload) {
            this._send(this.pendingPayload);
            this.pendingPayload = null;
          }

          resolve();
        },

        onStompError: (frame) => {
          console.error('[STOMP] Broker reported error:', frame.headers['message']);
          console.error('[STOMP] Additional details:', frame.body);
          reject(new Error(frame.headers['message']));
        },

        onDisconnect: () => {
          console.log('[STOMP] Disconnected');
        },

        onWebSocketError: (error) => {
          console.error('[WebSocket] Transport error:', error);
          reject(error);
        },
      });

      this.client.activate();
    });
  }

  private _send(body: string) {
    this.client?.publish({
      destination: `/app/board/${this.boardToken}/sync`,
      body,
    });
  }

  send(components: UmlComponent[], arrows: UmlArrow[]) {
    const payload = JSON.stringify(serializeBoard(components, arrows));

    if (!this.client?.connected) {
      this.pendingPayload = payload;
      return;
    }

    this._send(payload);
  }

  disconnect() {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.client?.deactivate();
    this.client = null;
    this.boardToken = null;
  }
}

export const boardWsClient = new BoardWebSocketClient();

export const boardApi = {
  connect: (token: string, onRemoteUpdate: (payload: any) => void) =>
    boardWsClient.connect(token, onRemoteUpdate),

  saveBoard: (components: UmlComponent[], arrows: UmlArrow[]) =>
    boardWsClient.send(components, arrows),

  disconnect: () => boardWsClient.disconnect(),
};