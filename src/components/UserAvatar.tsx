import React, { useState, useEffect } from 'react';

interface UserSummary {
  firstName?: string;
  lastName?: string;
  username: string;
  avatarUrl?: string;
}

const UserAvatar: React.FC = () => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const rawData = localStorage.getItem('vertex_user');
    if (rawData) {
      try {
        setUser(JSON.parse(rawData));
      } catch (error) {
        console.error("Failed to parse user data", error);
      }
    }
  }, []);

  const getInitials = () => {
    if (!user) return "??";
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  // Common styling for both states
  const containerClasses = "w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-2 border-gray-200/20 overflow-hidden select-none bg-[#2C3E50]";

  if (user?.avatarUrl && !imageError) {
    return (
      <div className={containerClasses}>
        <img 
          src={user.avatarUrl} 
          alt={user.username}
          className="w-full h-full object-cover"
          // If the URL returns 404 or fails, switch to initials
          onError={() => setImageError(true)} 
        />
      </div>
    );
  }

  return (
    <div className={`${containerClasses} text-white font-bold text-2xl`}>
      {getInitials()}
    </div>
  );
};

export default UserAvatar;