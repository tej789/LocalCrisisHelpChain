import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Divider, Paper,
  CircularProgress, Stack, Chip, Container, Button, TextField,
  Snackbar, Alert
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer
} from 'recharts';

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function Dashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const auth = useAuth();

  const [profile, setProfile] = useState({ name: '', email: '', phone: '', role: '', city: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data } = await api.get('/api/requests');
        setRequests(Array.isArray(data) ? data : []);
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  useEffect(() => {
    const u = auth?.user || {};
    setProfile({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || '',
      city: u.city || u.area || '',
    });
  }, [auth?.user]);

  const handleProfileChange = (field) => (e) =>
    setProfile((p) => ({ ...p, [field]: e.target.value }));

  const handleSaveChanges = async () => {
    try {
      await api.put("/api/users/update-profile",
        { name: profile.name, phone: profile.phone, city: profile.city },
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );

      const res = await api.get("/api/users/me", {
        headers: { Authorization: `Bearer ${auth?.token}` },
      });

      setProfile(res.data);
      setSnackbar({ open: true, message: "Profile updated", severity: "success" });

    } catch {
      alert("Profile update failed");
    }
  };

  const totalRequests = requests.length;
  const openRequestsCount = requests.filter(r => r?.status === 'open').length;
  const resolvedRequestsCount = requests.filter(r => r?.status === 'resolved').length;

  const typeCounts = requests.reduce((a, r) => {
    a[r.type] = (a[r.type] || 0) + 1;
    return a;
  }, {});

  const urgencyCounts = requests.reduce((a, r) => {
    a[r.urgency] = (a[r.urgency] || 0) + 1;
    return a;
  }, {});

  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
  const urgencyData = Object.entries(urgencyCounts).map(([urgency, count]) => ({ urgency, count }));

  const firstWithCoords = requests.find(r => r.location?.coordinates?.length === 2);
  const mapCenter = firstWithCoords
    ? [firstWithCoords.location.coordinates[1], firstWithCoords.location.coordinates[0]]
    : [20.5937, 78.9629];

  return (
    <Box sx={{ py: 3, minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Container maxWidth="lg">

        {/* Header */}
        <Stack direction={{ xs: 'column', sm: 'row' }}
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}>

          <Typography variant="h5" fontWeight={700} textAlign="center">
            User Dashboard
          </Typography>

          <Button variant="outlined" color="error" size="small" onClick={auth.logout}>
            Logout
          </Button>
        </Stack>

        <Typography align="center" color="text.secondary" sx={{ mb: 2 }}>
          Real-time overview of crisis help activity
        </Typography>

        <Box display="flex" justifyContent="center" mb={2}>
          <Button variant="contained" onClick={() => navigate('/submit-request')}>
            File Help Request
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Stats */}
        <Grid container spacing={2} justifyContent="center" sx={{ mb: 4 }}>
          {[{
            icon: <AssignmentIcon color="primary" />,
            value: totalRequests,
            label: "Total Requests",
            color: "primary"
          },
          {
            icon: <PendingActionsIcon color="warning" />,
            value: openRequestsCount,
            label: "Open Requests",
            color: "warning.main"
          },
          {
            icon: <DoneAllIcon color="success" />,
            value: resolvedRequestsCount,
            label: "Resolved Requests",
            color: "success.main"
          }].map((item, i) => (
            <Grid key={i} item xs={12} sm={6} md={4}>
              <Paper elevation={3}
                sx={{ p: 2.5, textAlign: 'center', borderRadius: 3 }}>
                <Stack direction="row" justifyContent="center" spacing={1}>
                  {item.icon}
                  <Typography variant="h5" color={item.color}>
                    {item.value}
                  </Typography>
                </Stack>
                <Typography variant="body2">{item.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Charts + Map */}
        <Grid container spacing={3} sx={{ mb: 4 }}>

          {/* Pie */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography mb={1}>Requests by Type</Typography>
              <Box sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeData} dataKey="value" outerRadius={70}>
                      {typeData.map((_, i) =>
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      )}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Urgency */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography mb={1}>Requests by Urgency</Typography>
              <Box sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={urgencyData}>
                    <XAxis dataKey="urgency" />
                    <YAxis />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Map */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography mb={1}>Live Map</Typography>
              <Box sx={{ height: 240 }}>
                {loading ? (
                  <CircularProgress />
                ) : (
                  <MapContainer center={mapCenter} zoom={6} style={{ height: '100%' }}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {requests.filter(r => r.location?.coordinates?.length === 2)
                      .map(req => (
                        <Marker key={req._id}
                          position={[req.location.coordinates[1], req.location.coordinates[0]]}>
                          <Popup>{req.type}</Popup>
                        </Marker>
                      ))}
                  </MapContainer>
                )}
              </Box>
            </Paper>
          </Grid>

        </Grid>

        {/* Profile */}
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" mb={2}>User Profile</Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Name"
                value={profile.name}
                onChange={handleProfileChange('name')} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email"
                value={profile.email}
                InputProps={{ readOnly: true }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone"
                value={profile.phone}
                onChange={handleProfileChange('phone')} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="City"
                value={profile.city}
                onChange={handleProfileChange('city')} />
            </Grid>
          </Grid>

          <Box mt={2} textAlign="right">
            <Button variant="contained" onClick={handleSaveChanges}>
              Save Changes
            </Button>
          </Box>
        </Paper>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} variant="filled">
            {snackbar.message}
          </Alert>
        </Snackbar>

      </Container>
    </Box>
  );
}

export default Dashboard;
