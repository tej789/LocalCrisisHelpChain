import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, Snackbar, Alert, Drawer, IconButton, AppBar, Toolbar, Dialog, TextField, Container
} from '@mui/material';
import Grid from '@mui/material/Grid';
import MenuIcon from '@mui/icons-material/Menu';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from "socket.io-client";

import GroupsIcon from '@mui/icons-material/Groups';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';

// useNavigate removed (not used)
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AssignVolunteerDialog from '../components/AssignVolunteerDialog';
import Footer from '../components/Footer';


const socket = io(process.env.REACT_APP_API_URL);


function NGODashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const auth = useAuth();
  const [requests, setRequests] = useState([]);
  const [, setVolunteerNames] = useState({});
const [selectedRequest, setSelectedRequest] = useState(null);

  const [typeFilter, setTypeFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningRequestId, setAssigningRequestId] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [stats, setStats] = useState(null);

  // NGO Profile State
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    contact: '',
    role: 'ngo'
  });
useEffect(() => {
  const fetchStats = async () => {
    try {
      const res = await api.get('/api/requests/stats');
      setStats(res.data.data);
    } catch (err) {
      console.log("Stats error:", err);
    }
  };

  fetchStats();
}, []);

useEffect(() => {
  const fetchRequests = async () => {
    try {
      const res = await api.get('/api/requests?limit=10&sort=-createdAt');
      setRequests(res.data.data || []);
    } catch (err) {
      console.log("Requests error:", err);
    }
  };

  fetchRequests();
}, []);


  // ================= SOCKET UPDATES =================
  useEffect(() => {
    socket.on('requestAssigned', (updated) => {
      setRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
      if (updated?.assignedTo?.name) {
        setVolunteerNames(prev => ({
          ...prev,
          [updated.assignedTo._id]: updated.assignedTo.name
        }));
      }
    });

    socket.on('requestResolved', (updated) => {
      setRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
    });

    socket.on('newRequest', (newReq) => {
      setRequests(prev => [newReq, ...prev]);
    });

    return () => {
      socket.off('requestAssigned');
      socket.off('requestResolved');
      socket.off('newRequest');
    };
  }, []);

  // Load NGO Profile
  useEffect(() => {
    const u = auth?.user || {};
    setProfile({
      name: u.name || '',
      email: u.email || '',
      contact: u.contact || '',
      role: 'ngo'
    });
  }, [auth?.user]);

  const handleProfileChange = (field) => (e) => {
    setProfile((p) => ({ ...p, [field]: e.target.value }));
  };

  const handleSaveChanges = async () => {
    try {
      await api.put(
        "/api/ngo/update-profile",
        {
          name: profile.name,
          contact: profile.contact
        },
        {
          headers: {
            Authorization: `Bearer ${auth?.token}`,
          },
        }
      );

      // Reload updated profile from backend
      const res = await api.get("/api/ngo/me", {
        headers: {
          Authorization: `Bearer ${auth?.token}`,
        },
      });

      setProfile({
        name: res.data.name || '',
        email: res.data.email || '',
        contact: res.data.contact || '',
        role: 'ngo'
      });

      setSnackbar({
        open: true,
        message: "Profile updated successfully",
        severity: "success",
      });

      setProfileOpen(false);

    } catch (error) {
      console.error("Profile update failed", error);
      setSnackbar({
        open: true,
        message: "Failed to update profile",
        severity: "error",
      });
    }
  };

const urgencyPriority = {
  high: 3,
  medium: 2,
  low: 1
};

  // ================= FILTERING =================
  const filteredRequests = requests
  .filter(req => {
    const t = typeFilter ? req.type === typeFilter : true;
    const u = urgencyFilter ? req.urgency === urgencyFilter : true;
    const s = statusFilter ? req.status === statusFilter : true;
    return t && u && s;
  })
  .sort((a, b) => {
  const ua = urgencyPriority[a.urgency?.toLowerCase()] || 0;
  const ub = urgencyPriority[b.urgency?.toLowerCase()] || 0;

  const aOpen = a.status === "open" ? 1 : 0;
  const bOpen = b.status === "open" ? 1 : 0;

  // First prioritize OPEN
  if (bOpen !== aOpen) return bOpen - aOpen;

  // Then prioritize urgency
  return ub - ua;
});



  // ================= ASSIGN HANDLERS =================
  const handleOpenAssignDialog = (request) => {
  setAssigningRequestId(request._id);
  setSelectedRequest(request);
  setAssignDialogOpen(true);
};


  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setAssigningRequestId(null);
  };

  const handleAssignedSuccess = (updatedRequest) => {
    if (!updatedRequest?._id) {
      handleCloseAssignDialog();
      return;
    }

    setRequests(prev =>
      prev.map(r => r._id === updatedRequest._id ? updatedRequest : r)
    );

    if (updatedRequest.assignedTo?.name) {
      setVolunteerNames(prev => ({
        ...prev,
        [updatedRequest.assignedTo._id]: updatedRequest.assignedTo.name
      }));
    }

    setSnackbar({ open: true, message: 'Request assigned successfully!', severity: 'success' });
    handleCloseAssignDialog();
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // // ================= STATS =================
  // const totalRequests = requests.length;
  // const openRequests = requests.filter(r => r.status === 'open').length;
  // const assignedRequests = requests.filter(r => r.status === 'assigned').length;
  // const resolvedRequests = requests.filter(r => r.status === 'resolved').length;

  // ================= MAP =================
  const firstWithCoords = requests.find(r => r.location?.coordinates?.length === 2);
  const defaultPosition = [20.5937, 78.9629];
  const mapCenter = firstWithCoords
    ? [firstWithCoords.location.coordinates[1], firstWithCoords.location.coordinates[0]]
    : defaultPosition;

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
            NGO Dashboard
          </Typography>
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
              auth.logout();
            }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>

      {/* FIXED: container width */}
      <Container maxWidth="lg">


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
        <GroupsIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />

        {/* Title */}
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Welcome to NGO Dashboard
        </Typography>

        {/* Subtitle */}
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Coordinate, assign and resolve crisis support requests efficiently.
        </Typography>

        {/* Description */}
        <Typography variant="body2" color="text.secondary">
          Monitor requests, assign volunteers, and help communities faster.
        </Typography>
      </Paper>

{/* STATS */}
<Grid
  container
  spacing={2}
  sx={{ mb: 4 }}
  justifyContent="center"
>
  {[
  ['Total', stats?.total || 0],
  ['Open', stats?.status?.open || 0],
  ['Assigned', stats?.status?.assigned || 0],
  ['Resolved', stats?.status?.resolved || 0]
].map(([label, value]) => (
    <Grid
      item
      xs={6} sm={3}
      key={label}
      sx={{ display: 'flex', justifyContent: 'center' }}
    ><Paper
  sx={{
    p: 2,
    textAlign: "center",
    width: "100%",
    maxWidth: 140,
    borderRadius: 3,
    boxShadow: 3,
    transition: "0.2s",
    "&:hover": { boxShadow: 6, transform: "translateY(-3px)" }
  }}
>

        <Typography variant="h4">{value}</Typography>
        <Typography>{label}</Typography>
      </Paper>
    </Grid>
  ))}
</Grid>

{/* FILTER PANEL */}
<Paper
  sx={{
    mb: 2,
    p: { xs: 1.5, md: 3 },
    borderRadius: 4,
    boxShadow: 2,
    maxWidth: { xs: "95%", md: 900 },
    mx: "auto"
  }}
>

<Grid
  container
  spacing={2}
  alignItems="stretch"
>

    {/* TYPE */}
<Grid item xs={12} md={3} sx={{ width: "100%" }}>
      <FormControl fullWidth size="small">

        <InputLabel>Request Type</InputLabel>
        <Select
          value={typeFilter}
          label="Request Type"
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {[...new Set(requests.map(r => r.type))].map(type => (
            <MenuItem key={type} value={type}>{type}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Grid>

    {/* URGENCY */}
<Grid item xs={12} md={3} sx={{ width: "100%" }}>
      <FormControl fullWidth size="small">
        <InputLabel>Urgency Level</InputLabel>
        <Select
          value={urgencyFilter}
          label="Urgency Level"
          onChange={(e) => setUrgencyFilter(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="high">High</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="low">Low</MenuItem>
        </Select>
      </FormControl>
    </Grid>

    {/* STATUS */}
<Grid item xs={12} md={3} sx={{ width: "100%" }}>
      <FormControl fullWidth size="small">
        <InputLabel>Request Status</InputLabel>
        <Select
          value={statusFilter}
          label="Request Status"
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="open">Open</MenuItem>
          <MenuItem value="assigned">Assigned</MenuItem>
          <MenuItem value="resolved">Resolved</MenuItem>
        </Select>
      </FormControl>
    </Grid>

    {/* CLEAR BUTTON */}
<Grid
  item
  xs={12}
  md={3}
  sx={{ display: "flex", justifyContent: "center" }}
>
  <Button
    variant="contained"
    sx={{
      height: { xs: 38, md: 40 },
      fontWeight: 600,
      px: 3,
      width: { xs: "100%", md: "auto" } // full on mobile, natural on PC
    }}
    onClick={() => {
      setTypeFilter("");
      setUrgencyFilter("");
      setStatusFilter("");
    }}
  >
    Clear Filters
  </Button>
</Grid>

  </Grid>
</Paper>



      {/* MOBILE CARDS (xs–sm) */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        {filteredRequests.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <SentimentSatisfiedAltIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="body1" color="text.secondary">No requests found.</Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {filteredRequests.map(req => (
              <Grid item xs={12} key={req._id}>
<Paper
 sx={{
  p: 2,
  borderRadius: 3,
  boxShadow: 2,
  transition: "0.2s",
  backgroundColor:
    req.urgency === "high" && req.status === "open"
      ? "#fff4f4"
      : "#fff",
  "&:hover": { boxShadow: 4 }
}}

>

                  <Box display="flex" justifyContent="space-between" alignItems="center">
<Typography
  variant="subtitle1"
  fontWeight={700}
  color="primary"
>
  {req.type}
</Typography>
<Chip
  label={req.urgency}
  size="small"
  color={
    req.urgency === "high"
      ? "error"
      : req.urgency === "medium"
      ? "warning"
      : "success"
  }
/>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {req.description}
                  </Typography>

                  <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
<Chip
  label={req.status}
  size="small"
  color={
    req.status === "open"
      ? "warning"
      : req.status === "assigned"
      ? "primary"
      : "success"
  }
  sx={{ fontWeight: 600 }}
/>
                    <Typography variant="caption">
                      Assigned: {req.assignedTo?.name || '-'}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2, textAlign: 'right' }}>
                    {req.status === 'open' && !req.assignedTo ? (
                      <Button
                       size="small"
  variant="contained"
  sx={{
    fontWeight: 600,
    borderRadius: 2,
    px: 2,
    boxShadow: 2,
    "&:hover": { boxShadow: 4 }
  }}
   onClick={() => handleOpenAssignDialog(req)}
                      >
                        Assign Volunteer
                      </Button>
                    ) : (
                      <Button size="small" disabled>Assign</Button>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
      {/* TABLE */}
<TableContainer
  component={Paper}
  sx={{
    borderRadius: 3,
    boxShadow: 3,
    overflow: "hidden",
    display: { xs: 'none', md: 'block' }
  }}
>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Urgency</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned Volunteer</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredRequests.map(req => (
<TableRow
  key={req._id}
  sx={{
    backgroundColor:
      req.urgency === "high" && req.status === "open"
        ? "#fff4f4"
        : "inherit"
  }}
>

                <TableCell>{req.type}</TableCell>
                <TableCell>{req.urgency}</TableCell>
                <TableCell>{req.description}</TableCell>
                <TableCell>
<Chip
  label={req.status}
  size="small"
  color={
    req.status === "open"
      ? "warning"
      : req.status === "assigned"
      ? "primary"
      : "success"
  }
  sx={{ fontWeight: 600 }}
/>
                </TableCell>
                <TableCell>
                  {req.assignedTo?.name || '-'}
                </TableCell>
                <TableCell>
                  {req.status === 'open' && !req.assignedTo ? (
                    <Button
                      size="small"
  variant="contained"
  sx={{
    fontWeight: 600,
    borderRadius: 2,
    px: 2,
    boxShadow: 2,
    "&:hover": { boxShadow: 4 }
  }}
                      onClick={() => handleOpenAssignDialog(req)}

                    >
                      Assign Volunteer
                    </Button>
                  ) : (
                    <Button size="small" disabled>Assign</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ASSIGN DIALOG */}
 <AssignVolunteerDialog
  open={assignDialogOpen}
  requestId={assigningRequestId}
  requestLocation={selectedRequest?.location}
  onClose={handleCloseAssignDialog}
  onAssigned={handleAssignedSuccess}
/>


      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* MAP */}
      <Paper sx={{ mt: 4, p: 2, borderRadius: 2, boxShadow: 1 }}>
        <Typography variant="h6">Request Map</Typography>
        <Box sx={{ height: 400 }}>
          <MapContainer center={mapCenter} zoom={6} style={{ height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {filteredRequests
              .filter(r => r.location?.coordinates?.length === 2)
              .map(r => (
                <Marker
                  key={r._id}
                  position={[r.location.coordinates[1], r.location.coordinates[0]]}
                >
                  <Popup>
                    <strong>{r.type}</strong><br />
                    {r.description}
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </Box>
      </Paper>
      
      {/* NGO Profile Dialog */}
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
            NGO Profile
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
      </Dialog>

      </Container>

      <Footer text="© 2026 Local Crisis HelpChain · NGO Dashboard" />
    </Box>
  );
}

export default NGODashboard;
