import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import DashboardPage from './pages/DashboardPage';
import BoardPage from './pages/BoardPage';
import EmailVerificationPage from './pages/EmailVerificationPage';


/**
 * The Root App Component.
 * This is where the high-level routing and global providers are defined.
 */
function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect empty path to register */}
        <Route path="/" element={<Navigate to="/register" replace />} />
        
        {/* Auth Routes */}
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} /> {/* Static info page */}
        <Route path="/email-verification" element={<EmailVerificationPage />} /> {/* Page to handle the handshake */}

        {/* Dashboard routes */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Board routes */}
        <Route path="/board" element={<BoardPage />} />

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