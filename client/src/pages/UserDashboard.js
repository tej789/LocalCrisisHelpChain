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

  // Save profile changes
  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      await api.put(
        "/api/users/update-profile",
        { name, phone },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      alert("Profile updated successfully");
    } catch (error) {
      console.error("Profile update failed", error);
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        paddingBottom: '80px',
        minHeight: '100vh',
        background: '#f7f9fc',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <h2 style={{ margin: 0 }}>User Dashboard</h2>
        <LogoutButton />
      </header>

      {/* Profile Card */}
      <section
        style={{
          maxWidth: '600px',
          padding: '24px',
          borderRadius: '12px',
          background: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          margin: '0 auto',
        }}
      >
        <h3 style={{ marginBottom: '16px' }}>User Profile</h3>

        <div style={{ marginBottom: '12px' }}>
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            disabled
            style={{ ...inputStyle, background: '#f1f1f1' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>Phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label>Role</label>
          <input
            type="text"
            value={role}
            disabled
            style={{ ...inputStyle, background: '#f1f1f1' }}
          />
        </div>

        <button
          onClick={handleSaveChanges}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </section>

      {/* Footer */}
      <Footer text="© 2026 Local Crisis HelpChain · Volunteer Dashboard" />
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px',
  marginTop: '4px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  boxSizing: 'border-box',
};
