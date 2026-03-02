import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  Stack,
  Snackbar,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import { Person as PersonIcon, Email as EmailIcon, Phone as PhoneIcon, LocationCity as LocationIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import UserLayout from '../components/user/UserLayout';

function UserProfile() {
  const auth = useAuth();
  const { updateUser } = auth;
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    contact: '',
    role: '',
    city: ''
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load profile from auth context
  useEffect(() => {
    const u = auth?.user || {};
    setProfile({
      name: u.name || '',
      email: u.email || '',
      contact: u.contact || '',
      role: (u.role || '').toString(),
      city: u.city || u.area || '',
    });
  }, [auth?.user]);

  const handleProfileChange = (field) => (e) => {
    setProfile((p) => ({ ...p, [field]: e.target.value }));
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      await api.put(
        "/api/users/update-profile",
        {
          name: profile.name,
          contact: profile.contact,
          city: profile.city,
        },
        {
          headers: {
            Authorization: `Bearer ${auth?.token}`,
          },
        }
      );

      // Reload updated profile from backend
      const res = await api.get("/api/users/me", {
        headers: {
          Authorization: `Bearer ${auth?.token}`,
        },
      });

      const updatedData = res.data;
      setProfile(updatedData);

      // ✅ UPDATE AUTH CONTEXT TO REFLECT CHANGES IN UI
      updateUser({
        name: updatedData.name,
        contact: updatedData.contact,
        city: updatedData.city,
      });

      setSnackbar({
        open: true,
        message: "Profile updated successfully!",
        severity: "success",
      });

    } catch (error) {
      console.error("Profile update failed", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to update profile",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserLayout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 3,
            backgroundColor: '#fff',
          }}
        >
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={2} mb={4}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'primary.main',
                fontSize: '2rem',
                fontWeight: 700,
              }}
            >
              {profile.name?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                User Profile
              </Typography>
              <Chip 
                label={profile.role?.toUpperCase() || 'USER'} 
                color="primary" 
                size="small" 
              />
            </Box>
          </Stack>

          <Divider sx={{ mb: 4 }} />

          {/* Profile Form */}
          <Stack spacing={3}>
            {/* Name */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <PersonIcon color="action" fontSize="small" />
                <Typography variant="subtitle2" color="text.secondary">
                  Full Name
                </Typography>
              </Stack>
              <TextField
                fullWidth
                variant="outlined"
                value={profile.name}
                onChange={handleProfileChange("name")}
                placeholder="Enter your full name"
              />
            </Box>

            {/* Email (Read-only) */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <EmailIcon color="action" fontSize="small" />
                <Typography variant="subtitle2" color="text.secondary">
                  Email Address
                </Typography>
              </Stack>
              <TextField
                fullWidth
                variant="outlined"
                value={profile.email}
                InputProps={{ readOnly: true }}
                disabled
                sx={{
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: 'rgba(0, 0, 0, 0.6)',
                  },
                }}
              />
            </Box>

            {/* Phone */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <PhoneIcon color="action" fontSize="small" />
                <Typography variant="subtitle2" color="text.secondary">
                  Phone Number
                </Typography>
              </Stack>
              <TextField
                fullWidth
                variant="outlined"
                value={profile.contact}
                onChange={handleProfileChange("contact")}
                placeholder="Enter your phone number"
              />
            </Box>

            {/* City */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <LocationIcon color="action" fontSize="small" />
                <Typography variant="subtitle2" color="text.secondary">
                  City
                </Typography>
              </Stack>
              <TextField
                fullWidth
                variant="outlined"
                value={profile.city}
                onChange={handleProfileChange("city")}
                placeholder="Enter your city"
              />
            </Box>
          </Stack>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} mt={4}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSaveChanges}
              disabled={loading}
              sx={{
                flex: 1,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => window.history.back()}
              sx={{
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              Cancel
            </Button>
          </Stack>
        </Paper>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </UserLayout>
  );
}

export default UserProfile;
