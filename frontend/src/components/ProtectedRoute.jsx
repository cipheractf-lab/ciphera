import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { Loading } from './ui';

// Component for routes that require authentication
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);

  // Show loading state while checking authentication
  if (loading) {
    return <Loading text="AUTHENTICATING..." />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If admin-only route and user is not admin, redirect to home
  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // If authenticated (and admin if required), render the children
  return children;
};

export default ProtectedRoute;
