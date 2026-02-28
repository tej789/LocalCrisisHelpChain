import React from "react";
import { Link, useLocation } from "react-router-dom";

const sidebarStyle = {
  width: '240px',
  background: 'linear-gradient(180deg, #2563eb 0%, #1e40af 100%)',
  color: '#ffffff',
  padding: '25px 20px',
  display: 'flex',
  flexDirection: 'column',
};

const logoStyle = {
  fontSize: '22px',
  fontWeight: 'bold',
  marginBottom: '40px',
  color: '#ffffff',
};
const navLinkStyle = {
  color: '#e0e7ff',
  textDecoration: 'none',
  padding: '12px 15px',
  borderRadius: '8px',
  marginBottom: '10px',
  fontWeight: '500',
  transition: 'all 0.2s ease',
};

const activeLinkStyle = {
  ...navLinkStyle,
  backgroundColor: '#ffffff',
  color: '#1e40af',
};
const Sidebar = () => {
  const location = useLocation();

  // Future-proof active match
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <aside style={sidebarStyle}>
      <div style={logoStyle}>LCHC Admin</div>

      <nav>
       <Link
  to="/admin"
  style={isActive('/admin') ? activeLinkStyle : navLinkStyle}
>
  Dashboard
</Link>

        {/* Future expansion example */}
        {/* 
        <Link
          to="/admin/ngos"
          style={
            isActive("/admin/ngos")
              ? activeLinkStyle
              : navLinkStyle
          }
        >
          NGOs
        </Link>

        <Link
          to="/admin/volunteers"
          style={
            isActive("/admin/volunteers")
              ? activeLinkStyle
              : navLinkStyle
          }
        >
          Volunteers
        </Link>
        */}
      </nav>
    </aside>
  );
};

export default Sidebar;