import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Card, CardContent, Divider, Paper, CircularProgress, Tooltip, Stack, Chip, Container, Button, TextField, Drawer, IconButton, AppBar, Toolbar, MenuItem, Rating, Avatar } from '@mui/material';
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
import NotificationCenterDialog from '../components/NotificationCenterDialog';
import VolunteerLocationMap from '../components/VolunteerLocationMap';




const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Reusable summary/stat card so layout stays consistent
const SummaryCard = ({ label, value, color }) => (
  <Paper
    sx={{
      p: 2,
      textAlign: 'center',
      borderRadius: 3,
      minWidth: 120,
      minHeight: 88,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 1,
    }}
  >
    <Typography
      variant="h5"
      sx={{ fontWeight: 700 }}
      color={color || 'text.primary'}
    >
      {value}
    </Typography>
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ mt: 0.5 }}
    >
      {label}
    </Typography>
  </Paper>
);

function UserDashboard() {
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null); // Track volunteer feature
  const [myRequests, setMyRequests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [communityRequests, setCommunityRequests] = useState([]);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [allFeedbackItems, setAllFeedbackItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [allFeedbackLoading, setAllFeedbackLoading] = useState(true);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackActionLoadingId, setFeedbackActionLoadingId] = useState(null);
  const [feedbackEditOpen, setFeedbackEditOpen] = useState(false);
  const [allFeedbackDialogOpen, setAllFeedbackDialogOpen] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [feedbackEditForm, setFeedbackEditForm] = useState({
    rating: 5,
    category: 'general',
    message: '',
  });
  const [showResolvedOnly, setShowResolvedOnly] = useState(false);
  const myRequestsRef = useRef(null);
  const feedbackRef = useRef(null);
  const navigate = useNavigate();
  const auth = useAuth();
  console.log("AUTH:", auth);
console.log("TOKEN VALUE:", auth?.token);
const allRequests = [...myRequests, ...communityRequests];
  // Minimal presentational profile state (no backend calls)
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', role: '', city: '' });
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    category: 'general',
    message: '',
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  
useEffect(() => {
  if (!auth?.token) {
    setLoading(false);
    setFeedbackLoading(false);
    setAllFeedbackLoading(false);
    return;
  }

  const fetchDashboardData = async () => {
    try {
      const [requestsResponse, feedbackResponse] = await Promise.all([
        api.get('/api/requests'),
        api.get('/api/feedback/my-feedback'),
      ]);
      const allFeedbackResponse = await api.get('/api/feedback/all');

      console.log("API DATA:", requestsResponse.data);

      setMyRequests(requestsResponse.data.myRequests || []);
      setCommunityRequests(requestsResponse.data.communityRequests || []);
      setPagination(requestsResponse.data.pagination || null);
      setFeedbackItems(feedbackResponse.data || []);
      setAllFeedbackItems(allFeedbackResponse.data || []);

    } catch (error) {
      console.error('Error fetching requests:', error);
      setMyRequests([]);
      setCommunityRequests([]);
      setPagination(null);
      setFeedbackItems([]);
      setAllFeedbackItems([]);
    } finally {
      setLoading(false);
      setFeedbackLoading(false);
      setAllFeedbackLoading(false);
    }
  };

  fetchDashboardData();
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

  const handleFeedbackChange = (field) => (event, value) => {
    const nextValue = field === 'rating' ? Number(value ?? 5) : event.target.value;
    setFeedbackForm((current) => ({ ...current, [field]: nextValue }));
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

  const handleSubmitFeedback = async () => {
    if (!feedbackForm.message.trim()) {
      setSnackbar({
        open: true,
        message: 'Please share your feedback before submitting.',
        severity: 'warning',
      });
      return;
    }

    setFeedbackSubmitting(true);

    try {
      const { data } = await api.post('/api/feedback', feedbackForm);

      setFeedbackItems((current) => [data, ...current]);
      setAllFeedbackItems((current) => [{
        ...data,
        userName: profile.name || auth?.user?.name || 'You',
      }, ...current]);
      setFeedbackForm({ rating: 5, category: 'general', message: '' });

      setSnackbar({
        open: true,
        message: 'Feedback submitted successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Feedback submit failed', error);
      setSnackbar({
        open: true,
        message: error?.response?.data?.error || 'Failed to submit feedback',
        severity: 'error',
      });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const openEditFeedback = (item) => {
    setEditingFeedbackId(item._id);
    setFeedbackEditForm({
      rating: item.rating,
      category: item.category,
      message: item.message,
    });
    setFeedbackEditOpen(true);
  };

  const handleFeedbackEditChange = (field) => (event, value) => {
    const nextValue = field === 'rating' ? Number(value ?? 5) : event.target.value;
    setFeedbackEditForm((current) => ({ ...current, [field]: nextValue }));
  };

  const handleUpdateFeedback = async () => {
    if (!editingFeedbackId) return;

    if (!feedbackEditForm.message.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter feedback message.',
        severity: 'warning',
      });
      return;
    }

    setFeedbackActionLoadingId(editingFeedbackId);

    try {
      const { data } = await api.put(`/api/feedback/${editingFeedbackId}`, feedbackEditForm);

      setFeedbackItems((current) => current.map((item) => (
        item._id === editingFeedbackId ? data : item
      )));

      setAllFeedbackItems((current) => current.map((item) => (
        item._id === editingFeedbackId
          ? { ...item, rating: data.rating, category: data.category, message: data.message, createdAt: data.createdAt }
          : item
      )));

      setFeedbackEditOpen(false);
      setEditingFeedbackId(null);

      setSnackbar({
        open: true,
        message: 'Feedback updated successfully',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error?.response?.data?.error || 'Failed to update feedback',
        severity: 'error',
      });
    } finally {
      setFeedbackActionLoadingId(null);
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (!id) return;

    setFeedbackActionLoadingId(id);

    try {
      await api.delete(`/api/feedback/${id}`);

      setFeedbackItems((current) => current.filter((item) => item._id !== id));
      setAllFeedbackItems((current) => current.filter((item) => item._id !== id));

      setSnackbar({
        open: true,
        message: 'Feedback deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error?.response?.data?.error || 'Failed to delete feedback',
        severity: 'error',
      });
    } finally {
      setFeedbackActionLoadingId(null);
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
  const publicFeedbackPreviewLimit = 3;
  const recentPublicFeedback = allFeedbackItems.slice(0, publicFeedbackPreviewLimit);

  // Map center
  const requestWithCoords = myRequests.find(
    (r) => r.location && r.location.coordinates && r.location.coordinates.length === 2
  ) || allRequests.find(
    (r) => r.location && r.location.coordinates && r.location.coordinates.length === 2
  );

  const defaultPosition = [20.5937, 78.9629]; // Center of India
  const mapCenter = requestWithCoords
    ? [requestWithCoords.location.coordinates[1], requestWithCoords.location.coordinates[0]]
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
            User Dashboard
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationBell />
            <IconButton
              onClick={() => setProfileOpen(true)}
              sx={{ p: 0.5, border: 'none', boxShadow: 'none', bgcolor: 'transparent' }}
              aria-label="open profile"
            >
              <Avatar
                src={auth?.user?.profilePhoto || undefined}
                sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}
              >
                {(profile.name || auth?.user?.name || 'U').charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
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

          <Button
            fullWidth
            variant="outlined"
            sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}
            onClick={() => {
              setSidebarOpen(false);
              setNotificationsOpen(true);
            }}
          >
            Notifications
          </Button>

          {/* File Help Request – navigates to existing submit-request form */}
          <Button
            fullWidth
            variant="outlined"
            sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}
            onClick={() => {
              setSidebarOpen(false);
              navigate('/submit-request');
            }}
          >
            File Help Request
          </Button>

          {/* My Open Requests – scrolls to My Requests section showing open items */}
          <Button
            fullWidth
            variant="outlined"
            sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}
            onClick={() => {
              setSidebarOpen(false);
              setShowResolvedOnly(false);
              if (myRequestsRef.current) {
                myRequestsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          >
            My Open Requests
          </Button>

          {/* Resolved Requests shortcut (before Logout) */}
          <Button
            fullWidth
            variant="outlined"
            sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}
            onClick={() => {
              setSidebarOpen(false);
              setShowResolvedOnly(true);
            }}
          >
            Resolved Requests
          </Button>

          <Button
            fullWidth
            variant="outlined"
            sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}
            onClick={() => {
              setSidebarOpen(false);
              setShowResolvedOnly(false);
              if (feedbackRef.current) {
                feedbackRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          >
            Feedback
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
<NotificationCenterDialog
  open={notificationsOpen}
  onClose={() => setNotificationsOpen(false)}
  title="Your Notifications"
/>
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

      {/* HERO SECTION – hide when viewing only resolved requests */}
      {!showResolvedOnly && (
        <>
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
        </>
      )}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }} ref={myRequestsRef}>
  <Typography variant="h6" gutterBottom>
    📌 My Requests
  </Typography>

  {myRequests.filter(r => showResolvedOnly ? r.status === "resolved" : r.status !== "resolved").length === 0 ? (
    <Typography color="text.secondary">
      You haven’t submitted any requests yet.
    </Typography>
  ) : (
    myRequests
      .filter(req => (showResolvedOnly ? req.status === "resolved" : req.status !== "resolved"))
      .map(req => (
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

          {/* Track Volunteer Button - Only show when status is assigned (and not in resolved-only view) */}
          {!showResolvedOnly && req.status === "assigned" && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              sx={{ mt: 2, borderRadius: 2 }}
              onClick={() => setSelectedRequestId(req._id)}
            >
              📍 Track Volunteer
            </Button>
          )}
        </CardContent>
      </Card>
    ))
  )}
 </Paper>

      {/* When viewing only resolved requests, hide the rest of the dashboard */}
      {!showResolvedOnly && (
        <>
     {/* Track Volunteer Map - Show when a request is selected */}
     {selectedRequestId && (
       <VolunteerLocationMap 
         requestId={selectedRequestId} 
         onClose={() => setSelectedRequestId(null)}
       />
     )}

     {/* ================= MY REQUESTS SUMMARY ================= */}
<Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
  🔹 My Requests Summary
</Typography>

<Grid
  container
  spacing={2}
  sx={{ mb: 4 }}
  justifyContent="center"
>
  <Grid item xs={6} sm={4} md={3}>
    <SummaryCard label="My Total" value={myTotal} />
  </Grid>

  <Grid item xs={6} sm={4} md={3}>
    <SummaryCard
      label="My Open"
      value={myOpen}
      color="warning.main"
    />
  </Grid>

  <Grid item xs={6} sm={4} md={3}>
    <SummaryCard
      label="My Resolved"
      value={myResolved}
      color="success.main"
    />
  </Grid>
</Grid>

{/* ================= COMMUNITY OVERVIEW ================= */}
<Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
  🔹 Community Overview
</Typography>

<Grid
  container
  spacing={2}
  sx={{ mb: 6 }}
  justifyContent="center"
>
  <Grid item xs={6} sm={4} md={3}>
    <SummaryCard label="Community Total" value={communityTotal} />
  </Grid>

  <Grid item xs={6} sm={4} md={3}>
    <SummaryCard
      label="Community Open"
      value={communityOpen}
      color="warning.main"
    />
  </Grid>

  <Grid item xs={6} sm={4} md={3}>
    <SummaryCard
      label="Community Assigned"
      value={communityAssigned}
      color="info.main"
    />
  </Grid>
</Grid>

<Paper sx={{ p: 3, mb: 6, borderRadius: 3 }} ref={feedbackRef}>
  <Stack spacing={0.5} sx={{ mb: 3 }}>
    <Typography variant="h6" sx={{ fontWeight: 600 }}>
      Feedback
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Share what is working well and see what other users have submitted.
    </Typography>
  </Stack>

  <Grid container spacing={3}>
    <Grid item xs={12} md={5}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Rating
          </Typography>
          <Rating
            value={feedbackForm.rating}
            onChange={handleFeedbackChange('rating')}
            size="large"
          />
        </Box>

        <TextField
          select
          fullWidth
          label="Category"
          value={feedbackForm.category}
          onChange={handleFeedbackChange('category')}
        >
          <MenuItem value="general">General</MenuItem>
          <MenuItem value="app">App Experience</MenuItem>
          <MenuItem value="service">Service Quality</MenuItem>
          <MenuItem value="response">Response Time</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </TextField>

        <TextField
          fullWidth
          label="Your feedback"
          multiline
          minRows={4}
          value={feedbackForm.message}
          onChange={handleFeedbackChange('message')}
          placeholder="Tell us how we can improve the experience for you and your community."
        />

        <Button
          variant="contained"
          onClick={handleSubmitFeedback}
          disabled={feedbackSubmitting}
          sx={{ alignSelf: 'flex-start', px: 3, fontWeight: 600 }}
        >
          {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </Stack>
    </Grid>

    <Grid item xs={12} md={7}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Public feedback feed
        </Typography>

        {allFeedbackLoading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : allFeedbackItems.length === 0 ? (
          <Typography color="text.secondary">
            No feedback has been submitted yet.
          </Typography>
        ) : (
          <>
          <Stack spacing={2}>
            {recentPublicFeedback.map((item) => (
              <Card key={item._id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
                    <Rating value={item.rating} readOnly size="small" />
                    <Chip label={item.category} size="small" />
                    <Chip label={item.userName || 'Anonymous'} size="small" variant="outlined" />
                  </Stack>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {item.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
          {allFeedbackItems.length > publicFeedbackPreviewLimit && (
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setAllFeedbackDialogOpen(true)}
              >
                All Feedback
              </Button>
            </Box>
          )}
          </>
        )}
      </Paper>
    </Grid>
  </Grid>
</Paper>

<Paper variant="outlined" sx={{ p: 2.5, mb: 6, borderRadius: 3 }}>
  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
    Your feedback history
  </Typography>

  {feedbackLoading ? (
    <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress size={24} />
    </Box>
  ) : feedbackItems.length === 0 ? (
    <Typography color="text.secondary">
      You have not submitted feedback yet.
    </Typography>
  ) : (
    <Stack spacing={2}>
      {feedbackItems.map((item) => (
        <Card key={item._id} variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
              <Rating value={item.rating} readOnly size="small" />
              <Chip label={item.category} size="small" />
            </Stack>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {item.message}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {new Date(item.createdAt).toLocaleString()}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => openEditFeedback(item)}
                disabled={feedbackActionLoadingId === item._id}
              >
                Edit
              </Button>
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={() => handleDeleteFeedback(item._id)}
                disabled={feedbackActionLoadingId === item._id}
              >
                Delete
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )}
</Paper>

<Dialog
  open={feedbackEditOpen}
  onClose={() => {
    setFeedbackEditOpen(false);
    setEditingFeedbackId(null);
  }}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>Edit Feedback</DialogTitle>
  <DialogContent>
    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Rating
        </Typography>
        <Rating
          value={feedbackEditForm.rating}
          onChange={handleFeedbackEditChange('rating')}
        />
      </Box>

      <TextField
        select
        fullWidth
        label="Category"
        value={feedbackEditForm.category}
        onChange={handleFeedbackEditChange('category')}
      >
        <MenuItem value="general">General</MenuItem>
        <MenuItem value="app">App Experience</MenuItem>
        <MenuItem value="service">Service Quality</MenuItem>
        <MenuItem value="response">Response Time</MenuItem>
        <MenuItem value="other">Other</MenuItem>
      </TextField>

      <TextField
        fullWidth
        label="Your feedback"
        multiline
        minRows={4}
        value={feedbackEditForm.message}
        onChange={handleFeedbackEditChange('message')}
      />
    </Box>
  </DialogContent>
  <DialogActions>
    <Button
      onClick={() => {
        setFeedbackEditOpen(false);
        setEditingFeedbackId(null);
      }}
    >
      Cancel
    </Button>
    <Button
      variant="contained"
      onClick={handleUpdateFeedback}
      disabled={!editingFeedbackId || feedbackActionLoadingId === editingFeedbackId}
    >
      Save
    </Button>
  </DialogActions>
</Dialog>

<Dialog
  open={allFeedbackDialogOpen}
  onClose={() => setAllFeedbackDialogOpen(false)}
  maxWidth="md"
  fullWidth
>
  <DialogTitle>All Feedback</DialogTitle>
  <DialogContent>
    {allFeedbackLoading ? (
      <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    ) : allFeedbackItems.length === 0 ? (
      <Typography color="text.secondary">
        No feedback has been submitted yet.
      </Typography>
    ) : (
      <Stack spacing={2} sx={{ mt: 1 }}>
        {allFeedbackItems.map((item) => (
          <Card key={item._id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
                <Rating value={item.rating} readOnly size="small" />
                <Chip label={item.category} size="small" />
                <Chip label={item.userName || 'Anonymous'} size="small" variant="outlined" />
              </Stack>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {item.message}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {new Date(item.createdAt).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setAllFeedbackDialogOpen(false)}>Close</Button>
  </DialogActions>
</Dialog>

       {/* Dashboard Main Row: Charts, Map, Recent Requests */}
<Grid container spacing={3} alignItems="stretch" sx={{ mb: 6 }}>
  <Grid item xs={12} sm={6} lg={3} sx={{ display: 'flex' }}>
    <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', borderRadius: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 8 }, flex: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <CategoryIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Requests by Type</Typography>
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


  <Grid item xs={12} sm={6} lg={3} sx={{ display: 'flex' }}>
    <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', borderRadius: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 8 }, flex: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <PriorityHighIcon color="error" />
        <Typography variant="h6" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Requests by Urgency</Typography>
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

  <Grid item xs={12} sm={6} lg={3} sx={{ display: 'flex' }}>
    <Paper elevation={1} sx={{ p: 2, display: 'flex', flexDirection: 'column', borderRadius: 3, boxShadow: 1, transition: 'box-shadow 0.15s', '&:hover': { boxShadow: 4 }, flex: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <MapIcon color="info" />
        <Typography variant="h6" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Live Request Map</Typography>
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

  <Grid item xs={12} sm={6} lg={3} sx={{ display: 'flex' }}>
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
        <Typography variant="h6" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Community Requests</Typography>
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
  </>
  )}
       
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
