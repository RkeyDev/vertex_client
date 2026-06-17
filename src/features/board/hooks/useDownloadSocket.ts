import { useEffect, useRef } from 'react';
import { Client, type StompSubscription } from '@stomp/stompjs';

export interface DownloadNotification {
  requestId: string;
  boardId: string;
  fileType: string;
  downloadUrl: string;
}

interface UseDownloadSocketProps {
  /** The STOMP client already managed by useBoardSocket — share it to avoid a second WS connection. */
  client: Client | null;
  /** The authenticated user's email, used to derive the personal STOMP topic. */
  userEmail: string | null;
  /** Called when a download-ready notification arrives. */
  onDownloadReady: (notification: DownloadNotification) => void;
}

/**
 * Subscribes to the user's personal download-ready STOMP topic and calls
 * {@code onDownloadReady} whenever the backend signals that an export is
 * complete.
 *
 * This hook re-uses the existing STOMP client from {@code useBoardSocket}
 * rather than opening a second WebSocket connection.  It subscribes only
 * once per (client, userEmail) pair and cleans up on unmount.
 *
 * Topic pattern: /topic/user/{sanitisedEmail}/download-ready
 * The sanitisation must mirror {@code DownloadNotificationService.sanitiseEmailForTopic}:
 *   '@' → '_at_'  and  '.' → '_'
 */
export function useDownloadSocket({
  client,
  userEmail,
  onDownloadReady,
}: UseDownloadSocketProps): void {
  const subscriptionRef   = useRef<StompSubscription | null>(null);
  const onDownloadReadyRef = useRef(onDownloadReady);

  // Keep callback ref fresh without re-subscribing on every render.
  useEffect(() => {
    onDownloadReadyRef.current = onDownloadReady;
  }, [onDownloadReady]);

  useEffect(() => {
    if (!client || !userEmail) return;

    const sanitised = sanitiseEmailForTopic(userEmail);
    const topic     = `/topic/user/${sanitised}/download-ready`;

    const trySubscribe = () => {
      if (!client.connected) return;

      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = client.subscribe(topic, (message) => {
        try {
          const notification = JSON.parse(message.body) as DownloadNotification;
          if (!isValidNotification(notification)) {
            console.warn('[useDownloadSocket] Malformed notification:', message.body);
            return;
          }
          onDownloadReadyRef.current(notification);
        } catch (err) {
          console.error('[useDownloadSocket] Failed to parse download notification:', err);
        }
      });

      console.info('[useDownloadSocket] Subscribed to', topic);
    };

    // The STOMP client may already be connected when this effect runs
    // (e.g. after a fast re-render).  The onConnect callback below handles
    // the case where it isn't yet.
    trySubscribe();

    // Intercept future connect events (reconnects / initial connect) to
    // re-subscribe — mirroring the pattern in useBoardSocket.
    const origOnConnect = client.onConnect;
    client.onConnect = (frame) => {
      origOnConnect?.call(client, frame);
      trySubscribe();
    };

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      // Restore the original handler so we don't chain stale closures.
      client.onConnect = origOnConnect;
    };
  }, [client, userEmail]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mirrors {@code DownloadNotificationService.sanitiseEmailForTopic} in Java.
 * Must stay in sync with the backend implementation.
 */
function sanitiseEmailForTopic(email: string): string {
  return email.replace(/@/g, '_at_').replace(/\./g, '_');
}

function isValidNotification(n: unknown): n is DownloadNotification {
  if (!n || typeof n !== 'object') return false;
  const obj = n as Record<string, unknown>;
  return (
    typeof obj.requestId   === 'string' && obj.requestId.length   > 0 &&
    typeof obj.boardId     === 'string' && obj.boardId.length     > 0 &&
    typeof obj.fileType    === 'string' && obj.fileType.length    > 0 &&
    typeof obj.downloadUrl === 'string' && obj.downloadUrl.length > 0
  );
}