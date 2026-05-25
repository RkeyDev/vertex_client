import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route protector that checks for the existence of the access token in localStorage.
 * If the user is not authenticated, they are immediately redirected to the register page.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('vertex_access_token');

  if (!token) {
    return <Navigate to="/register" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
