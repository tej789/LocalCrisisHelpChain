import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';

const AdminLayout = ({ children, handleLogout }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const layoutStyle = {
    display: 'flex',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)',
  };

  const mainContentStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    marginLeft: isMobile ? 0 : '248px',
  };
  const pageContentStyle = {
    padding: isMobile ? '16px 16px 24px' : '24px 28px 32px',
    flex: 1,
    boxSizing: 'border-box',
  };


  return (
    <div style={layoutStyle}>
      
      <Sidebar
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15,23,42,0.28)',
            zIndex: 900,
          }}
        />
      )}

      <div style={mainContentStyle}>
        <TopNavbar
          handleLogout={handleLogout}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isMobile={isMobile}
        />
        <main style={pageContentStyle}>{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;