import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import UserSidebar from './UserSidebar';
import UserTopNavbar from './UserTopNavbar';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function UserLayout({ children }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Responsive handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const mainContentStyle = {
    marginLeft: 0, // Always 0, sidebar is always overlay
    transition: 'margin-left 0.3s ease',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  };

  const overlayStyle = {
    display: sidebarOpen ? 'block' : 'none', // Show on both mobile and desktop when open
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1100,
  };

  return (
    <Box>
      <UserSidebar 
        isMobile={isMobile} 
        sidebarOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar}
        handleLogout={handleLogout}
      />
      <Box style={mainContentStyle}>
        <UserTopNavbar 
          toggleSidebar={toggleSidebar} 
          isMobile={isMobile} 
        />
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      </Box>
      <div style={overlayStyle} onClick={toggleSidebar}></div>
    </Box>
  );
}

export default UserLayout;
