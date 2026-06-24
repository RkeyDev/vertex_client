import React, { useState } from 'react';

interface ProjectCardProps {
  title: string;
  lastSaved: string;
  avatarUrl?: string;
  thumbnailUrl?: string;
  initials: string;
  isOwner?: boolean;
  onClick: () => void;
  onDeleteClick?: (e: React.MouseEvent) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  lastSaved,
  avatarUrl,
  thumbnailUrl,
  initials,
  isOwner,
  onClick,
  onDeleteClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-white rounded-xl shadow-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200 flex flex-col relative"
    >
      {/* Thumbnail Area */}
      <div className="h-48 bg-white flex items-center justify-center relative overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${title} thumbnail`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-white" />
        )}

        {/* Delete button - only visible when owner hovers */}
        {isOwner && isHovered && onDeleteClick && (
          <button
            id={`delete-board-${title.replace(/\s+/g, '-').toLowerCase()}`}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(e);
            }}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all duration-150 z-10"
            title="Delete board"
            aria-label={`Delete board ${title}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
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
