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
  display: "flex",
  minHeight: "100vh",
  backgroundColor: "#f4f6f9",
};

const mainContentStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  width: "100%",
};
  const pageContentStyle = {
  padding: isMobile ? "20px 15px" : "20px 40px 20px 280px",
  flex: 1,
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
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.3)",
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