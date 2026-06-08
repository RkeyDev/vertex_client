import React from 'react';

interface ProjectCardProps {
  title: string;
  lastSaved: string; // Formatted date string to be displayed (e.g., "Jun 7, 2026, 03:36 PM")
  avatarUrl?: string;
  initials: string;
  onClick: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ title, lastSaved, avatarUrl, initials, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200 flex flex-col"
    >
      {/* Thumbnail Area */}
      <div className="h-48 bg-white p-6 flex items-center justify-center relative overflow-hidden">
        {/* Project preview placeholder */}
      </div>

      {/* Card Footer */}
      <div className="bg-[#EAEAEA] border-t border-gray-300 p-4 flex items-center space-x-3">
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt="User" 
            className="w-8 h-8 rounded-full object-cover border border-gray-300 flex-shrink-0" 
          />
        ) : (
          <div className="w-8 h-8 bg-[#2C3E50] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-2xl font-bold text-[#333] truncate leading-tight">
            {title}
          </span>
          <span className="text-sm font-semibold text-gray-500 mt-0.5">
            Last Saved: {lastSaved}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;