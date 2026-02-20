import React, { useEffect, useState } from 'react';
import LogoutButton from '../components/LogoutButton';
import api from '../api/axios';
import Footer from '../components/Footer';
import UserProfile from "./UserProfile";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";

export default function UserDashboard() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
const [profileOpen, setProfileOpen] = useState(false);
const auth = useAuth();

  // Fetch logged-in user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/users/me', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        setName(res.data.name || '');
        setEmail(res.data.email || '');
        setPhone(res.data.phone || '');
        setRole(res.data.role || '');
      } catch (error) {
        console.error('Failed to fetch profile', error);
      }
    };

    fetchProfile();
  }, []);

  // Save name & phone to MongoDB
  const handleSaveChanges = async () => {
    console.log("SAVE BUTTON CLICKED");
    try {
      await api.put(
        "/api/users/update-profile",
        {
          name,
phone,

        },
        {
          headers: {
            Authorization: `Bearer ${auth?.token}`,
          },
        }
      );
  
      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success',
      });
      
    } catch (error) {
      console.error("Profile update failed", error);
      alert("Failed to update profile");
    }
  };
  

  return (
    <div style={{ padding: '20px', paddingBottom: '80px', minHeight: '100vh' }}>
 <header
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  }}
>
  <h2 style={{ margin: 0 }}>User Dashboard</h2>

  <Button
    variant="outlined"
    size="small"
    sx={{ borderRadius: 2, fontWeight: 600 }}
    onClick={() => setProfileOpen(true)}
  >
    Profile
  </Button>
</header>

      <Footer text="© 2026 Local Crisis HelpChain · Volunteer Dashboard" />
    </div>
  );
}
