import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { User, LogOut, Search, Inbox } from 'lucide-react';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Requests from './pages/Requests';
import Chat from './pages/Chat';
import NotificationBell from './components/NotificationBell';

const Layout = ({ children }) => {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 font-sans">
      <nav className="p-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center bg-white dark:bg-dark-card shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center px-4">
          <Link to="/" className="text-2xl font-bold text-gradient hover:opacity-80 transition-opacity">
            SkillSwap
          </Link>
          <div className="flex gap-3 items-center">
            <Link to="/" className="text-slate-600 hover:text-brand-500 dark:text-slate-300 transition flex items-center gap-1 text-sm font-medium">
              <Search size={16} /> Discover
            </Link>
            <Link to="/requests" className="text-slate-600 hover:text-brand-500 dark:text-slate-300 transition flex items-center gap-1 text-sm font-medium">
              <Inbox size={16} /> Requests
            </Link>
            <Link to="/profile" className="text-slate-600 hover:text-brand-500 dark:text-slate-300 transition flex items-center gap-1 text-sm font-medium">
              <User size={16} /> Profile
            </Link>
            {/* Real-time notification bell */}
            <NotificationBell />
            <button onClick={logout} className="text-red-500 hover:text-red-600 transition flex items-center gap-1 ml-1 p-2 rounded-xl hover:bg-red-50">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto p-4 flex flex-col pt-8">
        {children}
      </main>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* SocketProvider must be inside Router to use useNavigate */}
        <SocketProvider>
          <Routes>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile"  element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
            <Route path="/chat/:matchId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/"         element={<ProtectedRoute><Home /></ProtectedRoute>} />
          </Routes>
        </SocketProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
