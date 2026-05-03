import React from "react";
import { Link } from "react-router-dom";

const Sidebar = ({ isMobile, sidebarOpen }) => {

const sidebarStyle = {
  width: "240px",
  background: "linear-gradient(180deg, #2563eb 0%, #1e40af 100%)",
  color: "#ffffff",
  padding: "25px 20px",
  position: "fixed",   // ALWAYS fixed
  left: isMobile ? (sidebarOpen ? "0" : "-260px") : "0",
  top: 0,
  height: "100vh",
  transition: "0.3s ease",
  zIndex: 1000,
};

  return (
    <aside style={sidebarStyle}>
      <div style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "40px" }}>
        LCHC Admin
      </div>

      <Link
        to="/admin"
        style={{
          color: "#fff",
          textDecoration: "none",
          padding: "10px 15px",
          display: "block",
          borderRadius: "6px",
          backgroundColor: "rgba(255,255,255,0.15)",
          marginBottom: "10px"
        }}
      >
        Dashboard
      </Link>

      <Link
        to="/admin/analytics"
        style={{
          color: "#fff",
          textDecoration: "none",
          padding: "10px 15px",
          display: "block",
          borderRadius: "6px",
          backgroundColor: "rgba(255,255,255,0.1)",
          transition: "0.2s",
          cursor: "pointer"
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(255,255,255,0.15)"}
        onMouseLeave={(e) => e.target.style.backgroundColor = "rgba(255,255,255,0.1)"}
      >
        📊 SOS Analytics
      </Link>
    </aside>
  );
};

export default Sidebar;