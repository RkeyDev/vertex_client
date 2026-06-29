import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  boardName: string;
  onBoardNameChange?: (name: string) => void;
  onExportClick?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ boardName, onBoardNameChange, onExportClick }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleInvite = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = window.location.href;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, []);

  return (
    <>
      {/* Stylish toast notification */}
      <div
        style={{
          position: 'fixed',
          top: copied ? '28px' : '-80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          transition: 'top 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: '#ffffff',
            padding: '12px 22px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)',
            fontSize: '15px',
            fontWeight: '600',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span style={{ color: '#4ade80' }}>Board link copied!</span>
        </div>
      </div>

      <header className="h-20 bg-[#EAEAEA] border-b border-gray-400 flex items-center px-6 space-x-4 shadow-md z-10">
        <button
          onClick={handleInvite}
          className="bg-white border-2 border-gray-400 rounded px-6 py-1 text-2xl font-bold hover:bg-gray-100 shadow-sm transition-colors"
        >
          Invite
        </button>
        <button
          onClick={onExportClick}
          className="bg-white border-2 border-gray-400 rounded px-6 py-1 text-2xl font-bold hover:bg-gray-100 shadow-sm transition-colors"
        >
          Export
        </button>

        <div className="flex-1 flex justify-center px-10">
          <input
            className="bg-white border-2 border-gray-400 rounded w-full max-w-xl text-center py-1 text-2xl font-bold focus:outline-none focus:border-blue-500 transition-colors"
            type="text"
            value={boardName}
            onChange={(e) => onBoardNameChange?.(e.target.value)}
          />
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="bg-white border-2 border-gray-400 rounded px-6 py-1 text-2xl font-bold hover:bg-gray-200 shadow-sm transition-colors"
        >
          Quit
        </button>
      </header>
    </>
  );
};

export default TopBar;
