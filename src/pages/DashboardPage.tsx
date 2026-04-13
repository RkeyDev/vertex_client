import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosInstance'; 
import ProjectCard from '../../src/features/projects/components/ProjectCard.tsx';
import UserAvatar from '../components/UserAvatar.tsx';

interface ApiResponse<T> {
  message: string;
  data: T;
  errors: any;
  responseCode: string;
  timestamp: string;
}

interface OwnedBoardsResponse {
  boards: Board[]; 
}

interface Board {
  id: string;
  boardName: string;
}

interface NewBoardDTO {
  boardName: string;
}

// Interface matching your localStorage structure
interface UserSummary {
  firstName?: string;
  lastName?: string;
  username: string;
  avatarUrl?: string;
}

const DashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // REAL USER STATE: Pulling from localStorage
  const [user, setUser] = useState<UserSummary | null>(null);

  useEffect(() => {
    const rawData = localStorage.getItem('vertex_user');
    if (rawData) {
      try {
        setUser(JSON.parse(rawData));
      } catch (err) {
        console.error("Failed to parse user data in Dashboard", err);
      }
    }
  }, []);

  // Helper to get initials for the cards
  const getInitials = () => {
    if (!user) return "??";
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  const fetchBoards = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get<ApiResponse<OwnedBoardsResponse>>('/board/boards');
      const apiResponse = response.data;

      if (apiResponse.responseCode === "200" && apiResponse.data?.boards) {
        setProjects(apiResponse.data.boards);
        setError(null);
      } else {
        setProjects([]);
        setError(apiResponse.message || 'No access to boards.');
      }
    } catch (err: any) {
      console.error('Dashboard Data Fetch Error:', err);
      setError(err.message || 'Connection to Vertex backend failed.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const handleCreateBoard = async () => {
    const boardName = prompt("Enter project name:");
    if (!boardName || boardName.trim() === "") return;

    try {
      setIsCreating(true);
      const payload: NewBoardDTO = { boardName: boardName.trim() };
      const response = await api.post<ApiResponse<void>>('/board/new-board', payload);
      if (response.data.responseCode === "200") {
        await fetchBoards();
      } else {
        alert(`Error: ${response.data.message}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create new project.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#A5C7E9]/30">
      <aside className="w-64 bg-[#EAEAEA] flex flex-col border-r border-gray-300">
        <div className="p-8">
          <h1 className="text-5xl font-black text-[#333]">Vertex</h1>
        </div>
        <nav className="flex-1 mt-10">
          <ul className="space-y-2">
            <li className="bg-gray-300/50 px-8 py-4 text-4xl font-bold text-[#333] cursor-pointer">Projects</li>
            <li className="px-8 py-4 text-4xl font-bold text-[#333] hover:bg-gray-300 cursor-pointer transition-colors">Settings</li>
          </ul>
        </nav>
        <div className="p-8">
          <UserAvatar />
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#EAEAEA] h-20 flex items-center justify-between px-12 border-b border-gray-300 shadow-sm">
          <h2 className="text-5xl font-bold text-[#333]">Dashboard</h2>
          <button 
            onClick={handleCreateBoard}
            disabled={isCreating}
            className="bg-[#EAEAEA] hover:bg-gray-300 border-2 border-gray-400 rounded px-4 py-1 transition-all disabled:opacity-50"
          >
            <span className="text-2xl font-bold text-[#333]">
              {isCreating ? '+ Creating...' : '+ New'}
            </span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-12 bg-transparent">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <span className="text-2xl font-medium text-gray-500 animate-pulse">Loading...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-gray-800">No projects found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
              {projects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  title={project.boardName} 
                  avatarUrl={user?.avatarUrl} // Uses real URL
                  initials={getInitials()}    // Uses real initials
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;