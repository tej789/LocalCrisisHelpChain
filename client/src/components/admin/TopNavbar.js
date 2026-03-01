import React from "react";

const TopNavbar = ({ handleLogout, toggleSidebar, isMobile }) => {

  const navbarStyle = {
    height: "70px",
    backgroundColor: "#ffffff",
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    borderBottom: "1px solid #e0e0e0",
  };

  const logoutBtn = {
    marginLeft: "auto",
    backgroundColor: "#dc2626",
    color: "white",
    padding: "8px 16px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  };

  return (
    <header style={navbarStyle}>

      {isMobile && (
        <button
          onClick={toggleSidebar}
          style={{
            fontSize: "22px",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginRight: "15px"
          }}
        >
          ☰
        </button>
      )}

      <button style={logoutBtn} onClick={handleLogout}>
        Logout
      </button>
    </header>
  );
};

export default TopNavbar;