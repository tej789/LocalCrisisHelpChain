import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Divider, Paper, CircularProgress, Tooltip, Stack, Chip, Container, Button, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CategoryIcon from '@mui/icons-material/Category';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import MapIcon from '@mui/icons-material/Map';
import ListAltIcon from '@mui/icons-material/ListAlt';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Snackbar, Alert } from '@mui/material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
function Dashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const auth = useAuth();

  // Minimal presentational profile state (no backend calls)
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', role: '', city: '' });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data } = await api.get('/api/requests');
        setRequests(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching requests:', error);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRequests();
  }, []);

  // Initialize profile from auth state
  useEffect(() => {
    const u = auth?.user || {};
    setProfile({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      role: (u.role || '').toString(),
      city: u.city || u.area || '',
    });
  }, [auth?.user]);

  const handleProfileChange = (field) => (e) => {
    setProfile((p) => ({ ...p, [field]: e.target.value }));
  };

  // Save updates only to local auth context to avoid backend changes
 const handleSaveChanges = async () => {
  console.log("SAVE BUTTON CLICKED");

  try {
    await api.put(
      "/api/users/update-profile",
      {
        name: profile.name,
        phone: profile.phone,
        city: profile.city, // optional if backend supports
      },
      {
        headers: {
          Authorization: `Bearer ${auth?.token}`,
        },
      }
    );

    //  reload updated profile from backend
    const res = await api.get("/api/users/me", {
      headers: {
        Authorization: `Bearer ${auth?.token}`,
      },
    });

    setProfile(res.data);

    setSnackbar({
      open: true,
      message: "Profile updated successfully",
      severity: "success",
    });

  } catch (error) {
    console.error("Profile update failed", error);
    alert("Failed to update profile");
  }
};

  

  // Stats
// Stats
const totalRequests = Array.isArray(requests) ? requests.length : 0;
const openRequestsCount = Array.isArray(requests) ? requests.filter(r => r && r.status === 'open').length : 0;
const resolvedRequestsCount = Array.isArray(requests) ? requests.filter(r => r && r.status === 'resolved').length : 0;

  // Chart data
  const typeCounts = requests.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});
  const typeData = Object.entries(typeCounts).map(([type, count]) => ({ name: type, value: count }));

  const urgencyCounts = requests.reduce((acc, r) => {
    acc[r.urgency] = (acc[r.urgency] || 0) + 1;
    return acc;
  }, {});
  const urgencyData = Object.entries(urgencyCounts).map(([urgency, count]) => ({ urgency, count }));

  // Map center
  const firstWithCoords = requests.find(r => r.location && r.location.coordinates && r.location.coordinates.length === 2);
  const defaultPosition = [20.5937, 78.9629]; // Center of India
  const mapCenter = firstWithCoords ? [firstWithCoords.location.coordinates[1], firstWithCoords.location.coordinates[0]] : defaultPosition;

  return (
    <Box sx={{ py: { xs: 2, md: 4 }, minHeight: '100vh', backgroundColor: 'background.default' }}>
      
      {/* FIXED: container width */}
      <Container maxWidth="lg">
 {/* Header */}
<Stack
  direction={{ xs: 'column', sm: 'row' }}
  alignItems="center"
  justifyContent={{ xs: 'center', sm: 'space-between' }}
  spacing={2}
  sx={{ mb: 2 }}
>
  {/* Spacer for desktop centering */}
  <Box sx={{ display: { xs: 'none', sm: 'block' }, width: 96 }} />

  <Typography
    variant="h4"
    fontWeight={700}
    sx={{
      textAlign: 'center',
      flex: { sm: 1 }
    }}
  >
    User Dashboard
  </Typography>

  <Box
    sx={{
      width: { xs: '100%', sm: 'auto' },
      display: 'flex',
      justifyContent: { xs: 'center', sm: 'flex-end' }
    }}
  >
    <Button
      variant="outlined"
      color="error"
      size="small"
      onClick={auth.logout}
    >
      Logout
    </Button>
  </Box>
</Stack>

      {/* Subtitle centered */}
      <Typography
        variant="h6"
        color="text.secondary"
        align="center"
        sx={{ mb: 2 }}
      >
        Real-time overview of crisis help activity in your community
      </Typography>
  
      {/* Button centered */}
      <Box display="flex" justifyContent="center" mb={3}>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/submit-request')}
        >
          File Help Request
        </Button>
      </Box>
  
  


        <Divider sx={{ my: 3 }} />
       {/* Stats */}
<Grid container spacing={3} justifyContent="center" alignItems="stretch" sx={{ mb: 6 }}>
  <Grid item xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex' }}>
<Paper elevation={3} sx={{
      p: { xs: 2, md: 3 },   // FIXED
      textAlign: 'center',
      borderRadius: 3,
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: 8 },
      flex: 1
    }}>      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" mb={1}>
        <AssignmentIcon color="primary" />
        <Typography variant="h4" color="primary">{totalRequests}</Typography>
      </Stack>
      <Typography variant="subtitle1">Total Requests</Typography>
    </Paper>
  </Grid>
  <Grid item xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex' }}>
    <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderRadius: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 8 }, flex: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" mb={1}>
        <PendingActionsIcon color="warning" />
        <Typography variant="h4" color="warning.main">{openRequestsCount}</Typography>
      </Stack>
      <Typography variant="subtitle1">Open Requests</Typography>
    </Paper>
  </Grid>
  <Grid item xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex' }}>
    <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderRadius: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 8 }, flex: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" mb={1}>
        <DoneAllIcon color="success" />
        <Typography variant="h4" color="success.main">{resolvedRequestsCount}</Typography>
      </Stack>
      <Typography variant="subtitle1">Resolved Requests</Typography>
    </Paper>
  </Grid>
</Grid>
       {/* Dashboard Main Row: Charts, Map, Recent Requests */}
<Grid container spacing={3} alignItems="stretch" sx={{ mb: 6 }}>
  <Grid item xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex' }}>
    <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', borderRadius: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 8 }, flex: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <CategoryIcon color="primary" />
        <Typography variant="h6">Requests by Type</Typography>
      </Stack>
      <Box sx={{ flex: 1, minHeight: { xs: 240, md: 260 } }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
              {typeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  </Grid>

  <Grid item xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex' }}>
    <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', borderRadius: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 8 }, flex: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <PriorityHighIcon color="error" />
        <Typography variant="h6">Requests by Urgency</Typography>
      </Stack>
      <Box sx={{ flex: 1, minHeight: { xs: 240, md: 260 } }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={urgencyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <XAxis dataKey="urgency" />
            <YAxis allowDecimals={false} />
            <RechartsTooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  </Grid>

  <Grid item xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex' }}>
    <Paper elevation={1} sx={{ p: 2, display: 'flex', flexDirection: 'column', borderRadius: 3, boxShadow: 1, transition: 'box-shadow 0.15s', '&:hover': { boxShadow: 4 }, flex: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <MapIcon color="info" />
        <Typography variant="h6">Live Request Map</Typography>
      </Stack>
      <Box sx={{ flex: 1, minHeight: { xs: 240, md: 260 } }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
        ) : (
          <MapContainer center={mapCenter} zoom={6} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {requests.filter(r => r.location && r.location.coordinates && r.location.coordinates.length === 2).map((req) => (
              <Marker
                key={req._id}
                position={[req.location.coordinates[1], req.location.coordinates[0]]}
              >
                <Popup>
                  <Typography variant="subtitle1"><strong>{req.type}</strong> ({req.urgency})</Typography>
                  <Typography variant="body2">{req.description}</Typography>
                  <Typography variant="caption">{req.location?.address}</Typography>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </Box>
    </Paper>
  </Grid>

  <Grid item xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex' }}>
  <Paper
  elevation={1}
  sx={{
    p: 2,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 3,
    boxShadow: 1,
    transition: 'box-shadow 0.15s',
    '&:hover': { boxShadow: 4 },
    flex: 1,
    overflow: 'hidden',
    minHeight: 360,
    maxHeight: { xs: 420, md: 480 }
  }}
>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <ListAltIcon color="secondary" />
        <Typography variant="h6">Recent Requests</Typography>
      </Stack>
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: { xs: 240, md: 260 }, pr: 0.5 }}>
        {loading ? <CircularProgress /> : (
          <Box>
            {requests.slice(0, 8).map((req) => (
              <Card key={req._id} sx={{ mb: 2, boxShadow: 1, borderRadius: 2, transition: 'box-shadow 0.15s', '&:hover': { boxShadow: 3 } }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <Chip label={req.type} color="primary" size="small" />
                    <Chip label={req.urgency} color={req.urgency === 'high' ? 'error' : req.urgency === 'medium' ? 'warning' : 'success'} size="small" />
                    <Chip label={req.status} color={req.status === 'resolved' ? 'success' : req.status === 'assigned' ? 'info' : 'default'} size="small" />
                  </Stack>
                  <Typography variant="body1" gutterBottom>
                    {req.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {req.location?.address}
                  </Typography>
                </CardContent>
              </Card>
            ))}
            {requests.length === 0 && <Typography>No requests yet.</Typography>}
          </Box>
        )}
      </Box>
      <Box mt={2} textAlign="center">
        <Button variant="outlined" color="primary" onClick={() => navigate('/requests')}>
          View All Requests
        </Button>
      </Box>
    </Paper>
  </Grid>
</Grid>
        {/* User Profile (presentational, non-breaking) */}
        <Box sx={{ mt: 6 }}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 3, boxShadow: 1 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom color="primary">User Profile</Typography>
            <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>

                <TextField
                  fullWidth
                  label="Name"
                  value={profile.name}
                  onChange={handleProfileChange('name')}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>

                <TextField
                  fullWidth
                  label="Email"
                  value={profile.email}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>

                <TextField
                  fullWidth
                  label="Phone"
                  value={profile.phone}
                  onChange={handleProfileChange('phone')}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>

                <TextField
                  fullWidth
                  label="Role"
                  value={(profile.role || '').charAt(0).toUpperCase() + (profile.role || '').slice(1)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="City / Area (optional)"
                  value={profile.city}
                  onChange={handleProfileChange('city')}
                />
              </Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" color="primary" onClick={handleSaveChanges}>Save Changes</Button>
            </Box>
          </Paper>
        </Box>
        {/* Footer */}
        <Box mt={8} textAlign="center" color="text.secondary" fontSize={16}>
          &copy; {new Date().getFullYear()} Local Crisis HelpChain. All rights reserved.

        </Box>
        <Snackbar
  open={snackbar.open}
  autoHideDuration={3000}
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
    </Box>
  );
}

export default Dashboard;
