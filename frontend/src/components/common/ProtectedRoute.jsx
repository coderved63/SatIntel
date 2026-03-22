import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from './Loader';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-primary)' }}><Loader /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
