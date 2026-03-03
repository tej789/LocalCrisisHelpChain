import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Divider, Paper, CircularProgress, Tooltip, Stack, Chip, Container, Button, TextField, Drawer, IconButton, AppBar, Toolbar } from '@mui/material';
import Grid from '@mui/material/Grid';
import MenuIcon from '@mui/icons-material/Menu';
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
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import HandshakeIcon from '@mui/icons-material/Handshake';
import NotificationBell from '../components/NotificationBell';




const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
function UserDashboard() {
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
const [myRequests, setMyRequests] = useState([]);
const [pagination, setPagination] = useState(null);
const [communityRequests, setCommunityRequests] = useState([]);  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const auth = useAuth();
  console.log("AUTH:", auth);
console.log("TOKEN VALUE:", auth?.token);
const allRequests = [...myRequests, ...communityRequests];
  // Minimal presentational profile state (no backend calls)
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', role: '', city: '' });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  
useEffect(() => {
  if (!auth?.token) return;

  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/api/requests');

      console.log("API DATA:", data);

      setMyRequests(data.myRequests || []);
      setCommunityRequests(data.communityRequests || []);
      setPagination(data.pagination || null);   // ✅ ADD THIS

    } catch (error) {
      console.error('Error fetching requests:', error);
      setMyRequests([]);
      setCommunityRequests([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  fetchRequests();
}, [auth?.token]);

// useEffect(() => {
//   const fetchRequests = async () => {
//     try {
//       console.log("Calling API...");
//       const { data } = await api.get('/api/requests');
//       console.log("Response:", data);
//     } catch (err) {
//       console.error("API error:", err);
//     }
//   };

//   fetchRequests();
// }, []);
  // Initialize profile from auth state
  useEffect(() => {
    const u = auth?.user || {};
    setProfile({
      name: u.name || '',
      email: u.email || '',
      contact: u.contact || "", 
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
contact: profile.contact,
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

//stats
// ================= MY REQUESTS =================
const myTotal = pagination?.myTotal || 0;
const myOpen = myRequests.filter(
  r => r.status === "open"
).length;

const myResolved = myRequests.filter(
  r => r.status === "resolved"
).length;


// ================= COMMUNITY REQUESTS =================
const communityTotal = pagination?.communityTotal || 0;
const communityOpen = communityRequests.filter(
  r => r.status === "open"
).length;

const communityAssigned = communityRequests.filter(
  r => r.status === "assigned"
).length;
  // Chart data
 const typeCounts = allRequests.reduce((acc, r) => {
  acc[r.type] = (acc[r.type] || 0) + 1;
  return acc;
}, {});
  const typeData = Object.entries(typeCounts).map(([type, count]) => ({ name: type, value: count }));
const urgencyCounts = allRequests.reduce((acc, r) => {
  acc[r.urgency] = (acc[r.urgency] || 0) + 1;
  return acc;
}, {});
  const urgencyData = Object.entries(urgencyCounts).map(([urgency, count]) => ({ urgency, count }));

  // Map center
  const firstWithCoords = allRequests.find(r => r.location && r.location.coordinates && r.location.coordinates.length === 2);
  const defaultPosition = [20.5937, 78.9629]; // Center of India
  const mapCenter = firstWithCoords ? [firstWithCoords.location.coordinates[1], firstWithCoords.location.coordinates[0]] : defaultPosition;

  return (
    <Box sx={{ p: { xs: 1, md: 4 }, minHeight: '100vh', backgroundColor: 'background.default' }}>
      
      {/* Top Navigation Bar with Hamburger Menu */}
      <AppBar position="static" color="default" elevation={1} sx={{ mb: 3 }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => setSidebarOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            User Dashboard
          </Typography>
          
          <NotificationBell />
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        anchor="left"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      >
        <Box sx={{ width: 250, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Menu
          </Typography>
          
          {/* Profile Button */}
          <Button
            fullWidth
            variant="outlined"
            sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}
            onClick={() => {
              setSidebarOpen(false);
              setProfileOpen(true);
            }}
          >
            Profile
          </Button>

          {/* Logout Button */}
          <Button
            fullWidth
            variant="contained"
            color="error"
            sx={{ borderRadius: 2, fontWeight: 600 }}
            onClick={() => {
              setSidebarOpen(false);
              setLogoutOpen(true);
            }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>
      
      {/* FIXED: container width */}
      <Container maxWidth="lg">
<Dialog
  open={profileOpen}
  onClose={() => setProfileOpen(false)}
  maxWidth="xs"
  fullWidth
  PaperProps={{
    sx: {
      borderRadius: 3,
      p: 4
    }
  }}
>
  <Box textAlign="center" mb={2}>
    <Typography variant="h5" fontWeight={700}>
      User Profile
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Manage your account
    </Typography>
  </Box>

  <TextField
    fullWidth
    size="small"
    label="Name"
    value={profile.name}
    onChange={handleProfileChange("name")}
    sx={{ mb: 2 }}
  />

  <TextField
    fullWidth
    size="small"
    label="Email"
    value={profile.email}
    InputProps={{ readOnly: true }}
    sx={{ mb: 2 }}
  />

  <TextField
  fullWidth
  size="small"
  label="Phone"
  value={profile.contact}
  onChange={handleProfileChange("contact")}
  sx={{ mb: 2 }}
/>

  <TextField
    fullWidth
    size="small"
    label="Role"
    value={profile.role}
    InputProps={{ readOnly: true }}
    sx={{ mb: 3 }}
  />

  <Button
    fullWidth
    variant="contained"
    sx={{ mb: 2, fontWeight: 600 }}
    onClick={handleSaveChanges}
  >
    Save Changes
  </Button>

  <Button
    fullWidth
    variant="outlined"
    sx={{ mb: 2 }}
    onClick={() => setProfileOpen(false)}
  >
    Close
  </Button>

  <Button
    fullWidth
    variant="contained"
    color="error"
    onClick={() => {
      setProfileOpen(false);
      setLogoutOpen(true);
    }}
  >
    Logout
  </Button>
</Dialog>


<Dialog open={logoutOpen} onClose={() => setLogoutOpen(false)}>
  <DialogTitle>Confirm Logout</DialogTitle>

  <DialogContent>
    <DialogContentText>
      You will be signed out of your account.
    </DialogContentText>
  </DialogContent>

  <DialogActions>
    <Button onClick={() => setLogoutOpen(false)}>
      Cancel
    </Button>

    <Button
      color="error"
      variant="contained"
      onClick={() => {
        setLogoutOpen(false);
        auth.logout();
      }}
    >
      Logout
    </Button>
  </DialogActions>
</Dialog>

 {/* HERO SECTION */}
<Paper
  elevation={2}
  sx={{
    mb: 4,
    p: { xs: 2.5, md: 4 },
    borderRadius: 4,
    textAlign: "center",
    background: "#f5f7fa"
  }}
>
  {/* Logo / Icon */}
 <HandshakeIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />


  {/* Title */}
  <Typography variant="h5" fontWeight={700} gutterBottom>
    Welcome to Crisis Help Dashboard
  </Typography>

  {/* Subtitle */}
  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
    Track requests and stay connected with crisis support in your community.
  </Typography>

  {/* CTA */}
  <Button
    variant="contained"
    size="large"
    onClick={() => navigate("/submit-request")}
    sx={{ px: 4, fontWeight: 600,mt: 2  }}
  >
    File Help Request
  </Button>
</Paper>


        <Divider sx={{ my: 3 }} />
        <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
  <Typography variant="h6" gutterBottom>
    📌 My Requests
  </Typography>

  {myRequests.length === 0 ? (
    <Typography color="text.secondary">
      You haven’t submitted any requests yet.
    </Typography>
  ) : (
    myRequests.map(req => (
<Card
  key={req._id}
  sx={{
    mb: 2,
    borderRadius: 3,
    boxShadow: 1,
    transition: "all 0.2s",
    "&:hover": {
      boxShadow: 4,
      transform: "translateY(-2px)"
    }
  }}
>        <CardContent>
          <Stack direction="row" spacing={1} mb={1}>
            <Chip label={req.type} color="primary" size="small" />
            <Chip label={req.urgency} size="small" />
            <Chip label={req.status} size="small" />
          </Stack>

<Typography variant="h6" fontWeight={600}>            {req.description}
          </Typography>
<Typography
  variant="body2"
  sx={{ mt: 1, fontWeight: 500 }}
  color={
  req.status === "assigned"
    ? "success.main"
    : req.status === "resolved"
    ? "primary.main"
    : "text.secondary"
}
>
  {req.status === "open" && "Not assigned yet"}

  {req.status === "assigned" &&
    `✔ Assigned to ${req.assignedTo?.name}`}

  {req.status === "resolved" &&
    `✅ Resolved by ${req.assignedTo?.name || "Volunteer"}`}
</Typography>
        </CardContent>
      </Card>
    ))
  )}
</Paper>
     {/* ================= MY REQUESTS SUMMARY ================= */}
<Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
  🔹 My Requests Summary
</Typography>

<Grid container spacing={3} sx={{ mb: 4 }}>
  <Grid item xs={12} sm={4}>
    <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3 }}>
      <Typography variant="h4">{myTotal}</Typography>
      <Typography>My Total</Typography>
    </Paper>
  </Grid>

  <Grid item xs={12} sm={4}>
    <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3 }}>
      <Typography variant="h4" color="warning.main">{myOpen}</Typography>
      <Typography>My Open</Typography>
    </Paper>
  </Grid>

  <Grid item xs={12} sm={4}>
    <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3 }}>
      <Typography variant="h4" color="success.main">{myResolved}</Typography>
      <Typography>My Resolved</Typography>
    </Paper>
  </Grid>
</Grid>

{/* ================= COMMUNITY OVERVIEW ================= */}
<Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
  🔹 Community Overview
</Typography>

<Grid container spacing={3} sx={{ mb: 6 }}>
  <Grid item xs={12} sm={4}>
    <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3 }}>
      <Typography variant="h4">{communityTotal}</Typography>
      <Typography>Community Total</Typography>
    </Paper>
  </Grid>

  <Grid item xs={12} sm={4}>
    <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3 }}>
      <Typography variant="h4" color="warning.main">{communityOpen}</Typography>
      <Typography>Community Open</Typography>
    </Paper>
  </Grid>

  <Grid item xs={12} sm={4}>
    <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3 }}>
      <Typography variant="h4" color="info.main">{communityAssigned}</Typography>
      <Typography>Community Assigned</Typography>
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
      <Box sx={{ flex: 1, minHeight: { xs: 200, md: 260 } }}>
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
            {allRequests.filter(r => r.location && r.location.coordinates && r.location.coordinates.length === 2).map((req) => (
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
        <Typography variant="h6">Community Requests</Typography>
      </Stack>
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: { xs: 240, md: 260 }, pr: 0.5 }}>
        {loading ? <CircularProgress /> : (
          <Box>
            {communityRequests.slice(0, 8).map((req) => (
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
            {communityRequests.length === 0 && <Typography>No requests yet.</Typography>}
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

export default UserDashboard;
