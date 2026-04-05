import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';

export default function RoleProtectedRoute({ roles = [], children })
 {
  const auth = useAuth();
  const location = useLocation();

  if (auth?.loading) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  if (!auth?.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  const role = auth?.user?.role?.toLowerCase() || "";

  const allowed = roles.map(r => r.toLowerCase());

  if (roles.length && !allowed.includes(role)) {
    
    return <Navigate to={`/dashboard/${auth.user.role}`} replace />;

  }

  return children;
}
