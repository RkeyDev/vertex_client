import React, { useState, useEffect } from 'react';
import api from '../api/axiosInstance'; 
import ProjectCard from '../features/projects/components/ProjectCard.tsx';
import UserAvatar from '../components/UserAvatar.tsx';

/**
 * Matching Java backend: com.rkey.vertex_backend.core.api.ApiResponse
 */
interface ApiResponse<T> {
  message: string;
  data: T;
  errors: any;
  responseCode: string;
  timestamp: string;
}

/**
 * Matching Java backend: com.rkey.vertex_backend.core.api.board.OwnedBoardsResponse
 */
interface OwnedBoardsResponse {
  boards: Board[]; 
}

interface Board {
  id: string;
  title: string;
}

const DashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        setIsLoading(true);
        

        const response = await api.get<ApiResponse<OwnedBoardsResponse>>('/board/boards');

        const apiResponse = response.data;

        // Validate based on Spring Boot Controller logic ("200" check)
        if (apiResponse.responseCode === "200" && apiResponse.data?.boards) {
          setProjects(apiResponse.data.boards);
          setError(null);
        } else {
          setProjects([]);
          setError(apiResponse.message || 'No access to boards.');
        }
      } catch (err: any) {
        // Because of response interceptor, 'err' might be a standard Error object 
        // with the backend message already extracted.
        console.error('Dashboard Data Fetch Error:', err);
        
        // If the interceptor failed to refresh and threw an error, handle it gracefully
        setError(err.message || 'Connection to Vertex backend failed.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoards();
  }, []);

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

        <div className="p-8">
          <UserAvatar />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#EAEAEA] h-20 flex items-center justify-between px-12 border-b border-gray-300 shadow-sm">
          <h2 className="text-5xl font-bold text-[#333]">Dashboard</h2>
          <button className="bg-[#EAEAEA] hover:bg-gray-300 border-2 border-gray-400 rounded px-4 py-1 flex items-center space-x-2 transition-all shadow-sm group">
            <span className="text-2xl font-bold text-[#333]">+ New</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-12 bg-transparent !min-h-0">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <span className="text-2xl font-medium text-gray-500 animate-pulse">Loading Boards...</span>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-2xl font-bold text-red-600 mb-2">Backend Error</p>
              <p className="text-gray-500">{error}</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-3xl font-bold text-gray-800">No projects found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 auto-rows-min">
              {projects.map((project) => (
                <ProjectCard key={project.id} title={project.title} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;