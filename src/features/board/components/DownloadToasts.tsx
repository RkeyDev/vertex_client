import React from 'react';
import { type PendingDownload } from '../types/page.types';

interface DownloadToastsProps {
  pendingDownloads: PendingDownload[];
  onDismiss: (clientKey: string) => void;
}

const DownloadToasts: React.FC<DownloadToastsProps> = ({ pendingDownloads, onDismiss }) => {
  if (pendingDownloads.length === 0) return null;

  return (
    <div className="absolute top-14 right-4 z-40 flex flex-col gap-2">
      {pendingDownloads.map(d => (
        <div
          key={d.clientKey}
          className="flex items-center gap-3 bg-[#1e1e1e] border border-blue-500/40
                     text-gray-200 text-sm px-4 py-3 rounded-xl shadow-lg"
        >
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span>
            {d.requestId === null ? 'Preparing' : 'Downloading'}{' '}
            <span className="font-semibold text-blue-400">{d.fileType}</span>{' '}
            export…
          </span>
          <button
            onClick={() => onDismiss(d.clientKey)}
            className="ml-2 text-gray-500 hover:text-gray-200 transition-colors text-base leading-none flex-shrink-0"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};

export default DownloadToasts;
