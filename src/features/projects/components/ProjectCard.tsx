import React from 'react';

interface ProjectCardProps {
  title: string;
  avatarUrl?: string; // Optional image
  initials: string;   // Fallback text
}

const ProjectCard: React.FC<ProjectCardProps> = ({ title, avatarUrl, initials }) => {
  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200 flex flex-col">
      {/* Thumbnail Area */}
      <div className="h-48 bg-white p-6 flex items-center justify-center relative overflow-hidden">
        {/* You could eventually pass a project preview image here */}
      </div>

      {/* Card Footer */}
      <div className="bg-[#EAEAEA] border-t border-gray-300 p-4 flex items-center space-x-3">
        {/* User PFP Logic */}
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt="User" 
            className="w-8 h-8 rounded-full object-cover border border-gray-300" 
          />
        ) : (
          <div className="w-8 h-8 bg-[#2C3E50] rounded-full flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
        )}
        <span className="text-2xl font-bold text-[#333] truncate">{title}</span>
      </div>
    </div>
  );
};

export default ProjectCard;