import React, { useEffect, useState } from 'react';
import LogoutButton from '../components/LogoutButton';
import api from '../api/axios';
import Footer from '../components/Footer';

export default function UserDashboard() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);

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
          name: profile.name,
          phone: profile.phone,
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
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h2>User Dashboard</h2>
        <LogoutButton />
      </header>

      {/* USER PROFILE */}
      <section
        style={{
          maxWidth: '500px',
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          background: '#fff',
        }}
      >
        <h3>User Profile</h3>

        <div style={{ marginBottom: '10px' }}>
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            disabled
            style={{ width: '100%', padding: '8px', background: '#f3f3f3' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Role</label>
          <input
            type="text"
            value={role}
            disabled
            style={{ width: '100%', padding: '8px', background: '#f3f3f3' }}
          />
        </div>

        <button
          onClick={handleSaveChanges}
          disabled={loading}
          style={{
            padding: '10px 16px',
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </section>

      {/* Existing dashboard content can remain below */}
      {/* ...your maps, requests, charts, buttons stay untouched... */}

      <Footer text="© 2026 Local Crisis HelpChain · Volunteer Dashboard" />
    </div>
  );
}
