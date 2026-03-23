import React from 'react';
import { Box, List, ListItem, ListItemIcon, ListItemText, Typography, Divider, Button } from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  AddCircle as AddIcon,
  List as ListIcon,
  Public as PublicIcon,
  Person as PersonIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

function UserSidebar({ isMobile, sidebarOpen, toggleSidebar, handleLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const sidebarStyle = {
    width: '240px',
    height: '100vh',
    backgroundColor: '#1e293b',
    color: '#fff',
    position: 'fixed', // Always fixed position
    top: 0,
    left: sidebarOpen ? 0 : '-240px', // Hidden by default on all screens
    transition: 'left 0.3s ease',
    zIndex: 1200,
    overflowY: 'auto',
    boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle = {
    padding: '24px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
    textAlign: 'center',
    backgroundColor: '#0f172a',
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard/user' },
    { text: 'Profile', icon: <PersonIcon />, path: '/user/profile' },
    // File Help Request entry just below Profile, going to existing submit-request form
    { text: 'File Help Request', icon: <AddIcon />, path: '/submit-request' },
    { text: 'Community Requests', icon: <PublicIcon />, path: '/requests' },
    { text: 'Help', icon: <HelpIcon />, path: '/user/help' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      toggleSidebar();
    }
  };

  return (
    <Box sx={sidebarStyle}>
      <Box sx={headerStyle}>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#3b82f6', mb: 0.5 }}>
          LocalCrisis
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          HelpChain
        </Typography>
      </Box>

      <List sx={{ px: 1, py: 2, flex: 1 }}>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem
              button
              key={index}
              onClick={() => handleNavigation(item.path)}
              sx={{
                borderRadius: 2,
                mb: 1,
                backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                '&:hover': {
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                },
                transition: 'background-color 0.2s',
              }}
            >
              <ListItemIcon sx={{ color: isActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.7)', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                sx={{ 
                  color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.87)',
                  '& .MuiListItemText-primary': { fontWeight: isActive ? 600 : 400 }
                }} 
              />
            </ListItem>
          );
        })}
      </List>

      {/* Resolved Requests + Logout at Bottom */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
        {/* Resolved Requests entry removed; user now sees resolved items from within the main dashboard menu. */}

        <Button
          fullWidth
          variant="contained"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            py: 1.5,
            fontWeight: 600,
            textTransform: 'none',
            backgroundColor: '#ef4444',
            '&:hover': {
              backgroundColor: '#dc2626',
            },
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );
}

export default UserSidebar;
