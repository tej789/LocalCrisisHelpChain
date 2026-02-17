import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function LogoutButton({ className, children }) {
  const auth = useAuth();

  const handleLogout = (e) => {
    e.preventDefault();

    const confirmLogout = window.confirm(
      "Are you sure you want to logout?"
    );

    if (confirmLogout) {
      auth.logout();
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={className}
      aria-label="Logout"
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        border: '1px solid #e57373',
        background: '#fff',
        color: '#d32f2f',
        fontWeight: 600,
        cursor: 'pointer',
        transition: '0.2s',
      }}
      onMouseOver={(e) => {
        e.target.style.background = '#fdecea';
      }}
      onMouseOut={(e) => {
        e.target.style.background = '#fff';
      }}
    >
      {children || 'Logout'}
    </button>
  );
}
