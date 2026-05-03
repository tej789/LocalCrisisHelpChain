import React from "react";
import { Box, Button, Stack, Typography } from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import LogoutIcon from '@mui/icons-material/Logout';

const TopNavbar = ({ handleLogout, toggleSidebar, isMobile }) => {

  const navbarStyle = {
    minHeight: '76px',
    backgroundColor: 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    padding: isMobile ? '0 14px 0 12px' : '0 24px',
    borderBottom: '1px solid rgba(148,163,184,0.25)',
    boxShadow: '0 1px 0 rgba(15,23,42,0.03)',
  };

  return (
    <header style={navbarStyle}>

      {isMobile && (
        <button
          onClick={toggleSidebar}
          style={{
            fontSize: '22px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginRight: '12px',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
          }}
        >
          ☰
        </button>
      )}

      {isMobile ? (
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
          Admin
        </Typography>
      ) : (
        <Stack spacing={0.2}>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.2, lineHeight: 1 }}>
            Admin Console
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage SOS requests, approvals, and volunteer assignments
          </Typography>
        </Stack>
      )}

      <Box sx={{ flex: 1 }} />

      <Button
        onClick={handleLogout}
        variant="contained"
        color="error"
        startIcon={<LogoutIcon />}
        sx={{
          borderRadius: 999,
          px: isMobile ? 1.5 : 2,
          textTransform: 'none',
          fontWeight: 700,
          boxShadow: 'none',
          minWidth: isMobile ? 92 : 0,
        }}
      >
        Logout
      </Button>
    </header>
  );
};

export default TopNavbar;