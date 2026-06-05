import React, { memo } from 'react';
import type { RemoteCursor } from '../hooks/useCursorSocket';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StageTransform {
  x: number;
  y: number;
  scale: number;
}

interface RemoteCursorsProps {
  cursors: Record<string, RemoteCursor>;
  stageTransform: StageTransform;
  /** Pixel offset of the canvas area from the left edge of the viewport (sidebar width) */
  canvasOffsetX?: number;
  /** Pixel offset of the canvas area from the top edge of the viewport (topbar height) */
  canvasOffsetY?: number;
}

// ─── Individual Cursor ────────────────────────────────────────────────────────

interface CursorProps {
  cursor: RemoteCursor;
  screenX: number;
  screenY: number;
}

const AVATAR_SIZE = 28;
const LABEL_OFFSET_X = AVATAR_SIZE + 6;
const LABEL_OFFSET_Y = 2;

/**
 * Renders a single remote user's cursor:
 *  • A small SVG pointer arrow
 *  • Their avatar (circular, with a coloured ring derived from their userId)
 *  • Their username in a pill label
 */
const CursorMarker = memo(({ cursor, screenX, screenY }: CursorProps) => {
  const { profile, userId } = cursor;

  // Derive a stable hue from the userId string so each user gets a unique colour
  const hue = userId
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  const ringColor  = `hsl(${hue}, 80%, 65%)`;
  const labelBg    = `hsl(${hue}, 50%, 20%)`;
  const labelBorder = `hsl(${hue}, 60%, 45%)`;

  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top:  screenY,
        pointerEvents: 'none',
        userSelect: 'none',
        transform: 'translate(0, 0)',
        zIndex: 9999,
        // GPU-composited layer — keeps cursor movement silky
        willChange: 'transform',
        transition: 'left 40ms linear, top 40ms linear',
      }}
    >
      {/* SVG pointer arrow */}
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <path
          d="M0 0 L0 16 L4.5 12 L7.5 19 L9.5 18 L6.5 11 L12 11 Z"
          fill={ringColor}
          stroke="#1a1a1a"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>

      {/* Avatar + label row — offset so it sits just right of the pointer tip */}
      <div
        style={{
          position: 'absolute',
          top:  LABEL_OFFSET_Y,
          left: LABEL_OFFSET_X,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
        }}
      >
        {/* Circular avatar */}
        <div
          style={{
            width:  AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: '50%',
            border: `2.5px solid ${ringColor}`,
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: `0 0 0 1.5px #1a1a1a, 0 2px 8px rgba(0,0,0,0.5)`,
            background: labelBg,
          }}
        >
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.username}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              // Fallback to initials if image fails
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            // Initials fallback
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: ringColor,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'monospace',
              }}
            >
              {profile.username.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Username pill */}
        <span
          style={{
            background: labelBg,
            border: `1px solid ${labelBorder}`,
            color: '#f0f0f0',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "'DM Mono', 'Fira Mono', monospace",
            padding: '2px 8px',
            borderRadius: 999,
            backdropFilter: 'blur(4px)',
            boxShadow: '0 1px 6px rgba(0,0,0,0.4)',
            letterSpacing: '0.02em',
          }}
        >
          {profile.username}
        </span>
      </div>
    </div>
  );
});

CursorMarker.displayName = 'CursorMarker';

// ─── Overlay ──────────────────────────────────────────────────────────────────

/**
 * Absolutely-positioned overlay that sits over the Konva canvas.
 * It converts each cursor's world-space (canvas) coordinates to screen-space
 * using the current stage transform, then renders a CursorMarker for each.
 */
const RemoteCursors: React.FC<RemoteCursorsProps> = ({
  cursors,
  stageTransform,
  canvasOffsetX = 256, // default: sidebar width
  canvasOffsetY = 48,  // default: topbar height
}) => {
  const entries = Object.values(cursors);
  if (entries.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top:    canvasOffsetY,
        left:   canvasOffsetX,
        width:  `calc(100vw - ${canvasOffsetX}px)`,
        height: `calc(100vh - ${canvasOffsetY}px)`,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 100,
      }}
    >
      {entries.map((cursor) => {
        // World → screen:  screenPos = worldPos * scale + stageOffset
        const screenX = cursor.x * stageTransform.scale + stageTransform.x;
        const screenY = cursor.y * stageTransform.scale + stageTransform.y;

        return (
          <CursorMarker
            key={cursor.userId}
            cursor={cursor}
            screenX={screenX}
            screenY={screenY}
          />
        );
      })}
    </div>
  );
};

export default RemoteCursors;