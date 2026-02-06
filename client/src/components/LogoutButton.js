import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function LogoutButton({ className, children }) {
  const auth = useAuth();

  const handleLogout = (e) => {
    e.preventDefault();
    // AuthContext.logout clears storage and redirects to /login
    auth.logout();
  };

  return (
    <button
      onClick={handleLogout}
      className={className}
      aria-label="Logout"
      style={{
        padding: '6px 10px',
        borderRadius: 4,
        border: '1px solid #ccc',
        background: 'white',
        cursor: 'pointer'
      }}
    >
      {children || 'Logout'}
    </button>
  );
}