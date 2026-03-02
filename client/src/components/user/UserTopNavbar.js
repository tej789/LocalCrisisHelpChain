import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';

function UserTopNavbar({ toggleSidebar, isMobile }) {
  const { user } = useAuth();

  const navbarStyle = {
    height: '70px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  };

  return (
    <Box sx={navbarStyle}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={toggleSidebar} sx={{ color: '#1e293b' }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600 }}>
          Welcome, {user?.name || 'User'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" sx={{ color: '#64748b', display: { xs: 'none', sm: 'block' } }}>
          {user?.email || ''}
        </Typography>
        <NotificationBell />
      </Box>
    </Box>
  );
}

export default UserTopNavbar;
