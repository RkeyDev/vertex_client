import React, { useState } from 'react';
import ProjectCard from '../features/projects/components/ProjectCard.tsx';
import UserAvatar from '../components/UserAvatar.tsx';

// Mock data structure - set to [] to test the empty state
const MOCK_PROJECTS = [
  {id: '1', title: 'Untitled', lastModified: '2026-03-10' },
];

const DashboardPage: React.FC = () => {
  const [projects] = useState(MOCK_PROJECTS);

  return (
    <div className="flex h-screen bg-[#A5C7E9]/30">
      {/* Sidebar */}
      <aside className="w-64 bg-[#EAEAEA] flex flex-col border-r border-gray-300">
        <div className="p-8">
          <h1 className="text-5xl font-black text-[#333]">Vertex</h1>
        </div>

        <nav className="flex-1 mt-10">
          <ul className="space-y-2">
            <li className="bg-gray-300/50 px-8 py-4 text-4xl font-bold text-[#333] cursor-pointer">
              Projects
            </li>
            <li className="px-8 py-4 text-4xl font-bold text-[#333] hover:bg-gray-300 cursor-pointer transition-colors">
              Settings
            </li>
          </ul>
        </nav>

        {/* User Profile Circle at Bottom */}
        <div className="p-8">
          <UserAvatar></UserAvatar>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <header className="bg-[#EAEAEA] h-20 flex items-center justify-between px-12 border-b border-gray-300 shadow-sm">
          <h2 className="text-5xl font-bold text-[#333]">Dashboard</h2>
          <button className="bg-[#EAEAEA] hover:bg-gray-300 border-2 border-gray-400 rounded px-4 py-1 flex items-center space-x-2 transition-all shadow-sm group">
            <span className="text-2xl font-bold text-[#333]">+ New</span>
          </button>
        </header>

        {/* Project Grid / Empty State */}
        <div className="flex-1 overflow-y-auto p-12 bg-transparent !min-h-0">
          {projects.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-3xl font-bold text-gray-800">
                No projects yet. Create your first project!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 auto-rows-min">
              {projects.map((project, index) => (
                <ProjectCard key={`${project.id}-${index}`} title={project.title} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;