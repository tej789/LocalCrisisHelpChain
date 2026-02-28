import React from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';

const layoutStyle = {
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: '#f4f6f9',
};

const mainContentStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
};

const pageContentStyle = {
  padding: '20px 40px', // Original padding
  flex: 1,
};

const AdminLayout = ({ children, handleLogout }) => {
  return (
    <div style={layoutStyle}>
      <Sidebar />
      <div style={mainContentStyle}>
        <TopNavbar handleLogout={handleLogout} />
        <main style={pageContentStyle}>
          {children }
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;