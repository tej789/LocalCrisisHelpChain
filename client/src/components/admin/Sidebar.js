import React from "react";
import { Link } from "react-router-dom";
import { useLocation } from 'react-router-dom';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';

const Sidebar = ({ isMobile, sidebarOpen }) => {
const location = useLocation();

const sidebarStyle = {
  width: '248px',
  background: 'linear-gradient(180deg, #1d4ed8 0%, #0f2f78 100%)',
  color: '#ffffff',
  padding: '24px 16px',
  position: 'fixed',
  left: isMobile ? (sidebarOpen ? '0' : '-270px') : '0',
  top: 0,
  height: '100vh',
  transition: '0.28s ease',
  zIndex: 1000,
  boxShadow: '4px 0 24px rgba(15,23,42,0.18)',
  overflowY: 'auto',
};

const navLinkStyle = (active) => ({
  color: '#fff',
  textDecoration: 'none',
  padding: '12px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  borderRadius: '12px',
  backgroundColor: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
  marginBottom: '10px',
  fontWeight: 700,
  border: active ? '1px solid rgba(255,255,255,0.22)' : '1px solid transparent',
  transition: '0.2s ease',
});

  return (
    <aside style={sidebarStyle}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '0.3px' }}>
          LCHC Admin
        </div>
        <div style={{ fontSize: '12px', opacity: 0.82, marginTop: '4px' }}>
          Control center
        </div>
      </div>

      <Link
        to="/admin"
        style={navLinkStyle(location.pathname === '/admin')}
      >
        <DashboardOutlinedIcon fontSize="small" />
        Dashboard
      </Link>

      <Link
        to="/admin/analytics"
        style={navLinkStyle(location.pathname === '/admin/analytics')}
      >
        <InsightsOutlinedIcon fontSize="small" />
        SOS Analytics
      </Link>
    </aside>
  );
};

export default Sidebar;