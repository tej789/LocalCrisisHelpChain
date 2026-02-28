import React from 'react';

const navbarStyle = {
  height: '70px',
  backgroundColor: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end', // Aligns items to the right
  padding: '0 40px',
  borderBottom: '1px solid #e0e0e0',
};

const logoutBtn = {
  backgroundColor: "#dc2626",   // modern red
  color: "white",
  padding: "8px 16px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "500",
  transition: "all 0.2s ease"
};

const TopNavbar = ({ handleLogout }) => {
  return (
    <header style={navbarStyle}>
      {/* You could add a search bar or user profile icon here */}
      <button style={logoutBtn} onClick={handleLogout}>
        Logout
      </button>
    </header>
  );
};

export default TopNavbar;