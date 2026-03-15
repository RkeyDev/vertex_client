import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';

/**
 * The Root App Component.
 * This is where we define the high-level routing and global providers.
 */
function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect empty path to register */}
        <Route path="/" element={<Navigate to="/register" replace />} />
        
        {/* Auth Routes */}
        <Route path="/register" element={<RegisterPage />} />
        
        {/* TODO add these later:
            <Route path="/login" element={<LoginPage />} />
            <Route path="/canvas" element={<CanvasPage />} /> 
        */}

        {/* 404 - Page Not Found fallback */}
        <Route path="*" element={
          <div className="flex items-center justify-center h-screen">
            <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;