import React from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (fileType: 'JPEG_ZIP' | 'PDF' | 'VERTEX') => void;
  exportError: string | null;
  exportSuccess: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  exportError,
  exportSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 animate-fade-in">
      <div className="bg-[#EAEAEA] rounded-2xl shadow-2xl p-8 flex flex-col space-y-6 w-[450px] border border-gray-300 animate-scale-in">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black text-[#333]">Export Board</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-3xl font-bold transition-colors cursor-pointer"
          >
            &times;
          </button>
        </div>
        
        <p className="text-sm text-gray-600 font-medium -mt-2">
          Select the format you wish to export this board in.
        </p>

        <div className="flex flex-col space-y-4">
          {[
            { type: 'JPEG_ZIP',   label: 'Image',        desc: 'Download standard JPEG image file' },
            { type: 'PDF',    label: 'PDF Document', desc: 'Save board as a printable PDF document' },
            { type: 'VERTEX', label: '.Vertex File', desc: 'Custom file type to import back later' },
          ].map((opt) => (
            <button
              key={opt.type}
              onClick={() => onExport(opt.type as any)}
              className="w-full flex items-center p-4 bg-white border-2 border-gray-300 rounded-xl hover:bg-blue-50 hover:border-blue-500 active:bg-blue-100 transition-all text-left group cursor-pointer shadow-sm"
            >
              <div className="flex-1">
                <div className="text-lg font-black text-[#333] group-hover:text-blue-700 transition-colors">
                  {opt.label}
                </div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">
                  {opt.desc}
                </div>
              </div>
              <div className="ml-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xl">
                &rarr;
              </div>
            </button>
          ))}
        </div>

        {exportError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm font-semibold">
            {exportError}
          </div>
        )}

        {exportSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm font-semibold text-center animate-pulse">
            Export queued! Your download will start automatically.
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-lg border-2 border-gray-400 text-gray-700 font-bold hover:bg-gray-200 active:bg-gray-300 transition-all cursor-pointer shadow-sm text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
