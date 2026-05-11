import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Card, CardContent, Divider, Paper, CircularProgress, Tooltip, Stack, Chip, Container, Button, TextField, Drawer, IconButton, AppBar, Toolbar, MenuItem, Rating, Avatar, List, ListItemButton, ListItemIcon, ListItemText, useMediaQuery, useTheme } from '@mui/material';
import Grid from '@mui/material/Grid';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
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
import { useLocation } from 'react-router-dom';
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
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NotificationBell from '../components/NotificationBell';
import NotificationCenterDialog from '../components/NotificationCenterDialog';
import VolunteerLocationMap from '../components/VolunteerLocationMap';
import Footer from '../components/Footer';
import SosButton from '../components/SosButton';
import RatingDialog from '../components/RatingDialog';
import { getTimePendingInfo } from '../utils/timeUtils';




const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Reusable summary/stat card so layout stays consistent
const SummaryCard = ({ label, value, color }) => (
  <Paper
    sx={{
      p: 2.5,
      textAlign: 'center',
      borderRadius: 2,
      minWidth: 120,
      minHeight: 95,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      transition: 'all 0.3s ease',
      '&:hover': {
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.12)',
        transform: 'translateY(-2px)',
      },
    }}
  >
    <Typography
      variant="h5"
      sx={{ fontWeight: 700, lineHeight: 1.2 }}
      color={color || 'text.primary'}
    >
      {value}
    </Typography>
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ mt: 0.75, fontWeight: 500 }}
    >
      {label}
    </Typography>
  </Paper>
);

function UserDashboard() {
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
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
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedRequestForRating, setSelectedRequestForRating] = useState(null);
  const myRequestsRef = useRef(null);
  const feedbackRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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

  const sidebarWidth = sidebarCollapsed ? 92 : 286;

  const closeMobileSidebar = () => setSidebarOpen(false);

  const navigateAndClose = (path) => {
    navigate(path);
    if (isMobile) closeMobileSidebar();
  };

  const openDialogAndClose = (setter) => {
    setter(true);
    if (isMobile) closeMobileSidebar();
  };

  const scrollToSection = (ref, extraAction) => {
    if (typeof extraAction === 'function') {
      extraAction();
    }

    if (isMobile) closeMobileSidebar();

    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const sidebarItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardOutlinedIcon fontSize="small" />,
      active: location.pathname === '/dashboard/user',
      onClick: () => navigateAndClose('/dashboard/user'),
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: <PersonOutlineIcon fontSize="small" />,
      active: profileOpen,
      onClick: () => openDialogAndClose(setProfileOpen),
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: <NotificationsNoneIcon fontSize="small" />,
      active: notificationsOpen,
      onClick: () => openDialogAndClose(setNotificationsOpen),
    },
    {
      key: 'request',
      label: 'File Help Request',
      icon: <AssignmentIcon fontSize="small" />,
      onClick: () => navigateAndClose('/submit-request'),
    },
    {
      key: 'nearby',
      label: 'Nearby Services',
      icon: <MapIcon fontSize="small" />,
      onClick: () => navigateAndClose('/user/nearby-services'),
    },
    {
      key: 'open',
      label: 'My Open Requests',
      icon: <ListAltIcon fontSize="small" />,
      onClick: () => scrollToSection(myRequestsRef, () => setShowResolvedOnly(false)),
    },
    {
      key: 'resolved',
      label: 'Resolved Requests',
      icon: <DoneAllIcon fontSize="small" />,
      active: showResolvedOnly,
      onClick: () => {
        setShowResolvedOnly(true);
        if (isMobile) closeMobileSidebar();
      },
    },
    {
      key: 'feedback',
      label: 'Feedback',
      icon: <RateReviewOutlinedIcon fontSize="small" />,
      onClick: () => scrollToSection(feedbackRef, () => setShowResolvedOnly(false)),
    },
    {
      key: 'about',
      label: 'About LCHC',
      icon: <InfoOutlinedIcon fontSize="small" />,
      onClick: () => openDialogAndClose(setAboutOpen),
    },
  ];

  const renderSidebarContent = (collapsed = false) => (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <Box
        sx={{
          px: collapsed ? 1.25 : 2,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 1,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar
            src={auth?.user?.profilePhoto || undefined}
            sx={{ width: 44, height: 44, bgcolor: 'primary.main', fontWeight: 700 }}
          >
            {(profile.name || auth?.user?.name || 'U').charAt(0).toUpperCase()}
          </Avatar>

          {!collapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} noWrap>
                {profile.name || auth?.user?.name || 'User'}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {profile.email || auth?.user?.email || 'No email available'}
              </Typography>
            </Box>
          )}
        </Stack>

        {!collapsed && !isMobile && (
          <IconButton
            size="small"
            onClick={() => setSidebarCollapsed(true)}
            aria-label="collapse navigation"
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {collapsed && !isMobile && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1.5 }}>
          <IconButton
            size="small"
            onClick={() => setSidebarCollapsed(false)}
            aria-label="expand navigation"
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Divider />

      <List sx={{ px: collapsed ? 1 : 1.5, py: 1.5, flex: 1 }}>
        {sidebarItems.map((item) => {
          const active = Boolean(item.active);

          return (
            <Tooltip key={item.key} title={collapsed ? item.label : ''} placement="right" arrow disableHoverListener={!collapsed}>
              <ListItemButton
                onClick={item.onClick}
                sx={{
                  mb: 0.75,
                  borderRadius: 2,
                  minHeight: 48,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 1.5 : 2,
                  backgroundColor: active ? 'rgba(59, 130, 246, 0.14)' : 'transparent',
                  color: active ? 'primary.main' : 'text.primary',
                  '&:hover': {
                    backgroundColor: active ? 'rgba(59, 130, 246, 0.18)' : 'rgba(15, 23, 42, 0.04)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, color: active ? 'primary.main' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: 14 }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Box
        sx={{
          p: collapsed ? 1.25 : 1.75,
          mt: 'auto',
          borderTop: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.04) 0%, rgba(239, 68, 68, 0.08) 100%)',
        }}
      >
        {!collapsed && (
          <Stack spacing={0.25} sx={{ mb: 1.25 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign out when you are done.
            </Typography>
          </Stack>
        )}

        {collapsed ? (
          <Tooltip title="Logout" placement="right" arrow>
            <IconButton
              onClick={() => openDialogAndClose(setLogoutOpen)}
              aria-label="logout"
              sx={{
                width: 44,
                height: 44,
                mx: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                bgcolor: 'error.main',
                boxShadow: '0 10px 20px rgba(239, 68, 68, 0.28)',
                '&:hover': {
                  bgcolor: 'error.dark',
                },
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            fullWidth
            variant="contained"
            startIcon={<LogoutIcon />}
            onClick={() => openDialogAndClose(setLogoutOpen)}
            sx={{
              minHeight: 48,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2.5,
              bgcolor: 'error.main',
              color: '#fff',
              boxShadow: '0 12px 24px rgba(239, 68, 68, 0.22)',
              '&:hover': {
                bgcolor: 'error.dark',
                boxShadow: '0 14px 28px rgba(239, 68, 68, 0.28)',
              },
            }}
          >
            Logout
          </Button>
        )}
      </Box>
    </Box>
  );
  
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

const myAssigned = myRequests.filter(
  r => r.status === "assigned"
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
    <Box sx={{
      p: { xs: 1, md: 4 },
      pl: { md: `${sidebarWidth + 32}px` },
      minHeight: '100vh',
      backgroundColor: 'background.default',
      transition: 'padding-left 0.25s ease',
    }}>

      {!isMobile && (
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            bottom: 16,
            width: sidebarWidth,
            borderRadius: 5,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#ffffff',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.10)',
          }}
        >
          {renderSidebarContent(sidebarCollapsed)}
        </Paper>
      )}

      {/* Top Navigation Bar */}
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open navigation"
            onClick={() => {
              if (isMobile) {
                setSidebarOpen(true);
              } else {
                setSidebarCollapsed((current) => !current);
              }
            }}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            User Dashboard
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationBell onViewAll={() => setNotificationsOpen(true)} />
            <SosButton />
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

      <Drawer
        anchor="left"
        open={sidebarOpen && isMobile}
        onClose={closeMobileSidebar}
        PaperProps={{
          sx: {
            width: 320,
            borderRadius: '0 24px 24px 0',
            bgcolor: 'background.paper',
            color: 'text.primary',
            overflow: 'hidden',
          },
        }}
      >
        {renderSidebarContent(false)}
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

<Dialog
  open={aboutOpen}
  onClose={() => setAboutOpen(false)}
  maxWidth="md"
  fullWidth
>
  <DialogTitle sx={{ pb: 1 }}>
    About Local Crisis HelpChain (LCHC)
  </DialogTitle>

  <DialogContent dividers>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
      LCHC is a coordinated crisis-response platform that helps people raise verified help requests,
      connect with volunteers and NGOs, and follow each case from open to resolved in a transparent way.
    </Typography>

    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            How LCHC Works
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Users submit emergency or support requests with location and urgency details. NGOs and volunteers
            review nearby requests, accept assignments, and update progress until resolution.
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Professional Tracking
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time status stages like Open, Assigned, and Resolved give a clear operational view.
            This improves accountability and helps communities understand response timelines.
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Trust and Safety
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Role-based access, profile management, and request visibility controls are designed to keep
            sensitive community information protected while enabling fast response coordination.
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Community Impact
          </Typography>
          <Typography variant="body2" color="text.secondary">
            LCHC shortens the gap between people in need and active responders. The platform combines
            structured workflows with local participation to build resilient support networks.
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  </DialogContent>

  <DialogActions sx={{ p: 2 }}>
    <Button variant="contained" onClick={() => setAboutOpen(false)}>
      Close
    </Button>
  </DialogActions>
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
  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
    <AssignmentIcon sx={{ fontSize: 28, color: 'primary.main' }} />
    <Typography variant="h5" fontWeight={700}>
      My Requests
    </Typography>
  </Stack>

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
    mb: 2.5,
    borderRadius: 2,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: "all 0.3s ease",
    border: '1px solid #e5e7eb',
    "&:hover": {
      boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
      transform: "translateY(-2px)",
      borderColor: '#1976d2'
    }
  }}
>  <CardContent sx={{ '&:last-child': { pb: 2 } }}>
    {/* Header with Category and Status */}
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <Chip 
              label={req.type} 
              color="primary" 
              size="small"
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
            <Chip 
              label={req.urgency} 
              size="small"
              icon={req.urgency === 'high' ? <PriorityHighIcon sx={{ fontSize: 14 }} /> : undefined}
              variant={req.urgency === 'high' ? "filled" : "outlined"}
              color={req.urgency === 'high' ? 'error' : 'default'}
              sx={{ fontWeight: 500 }}
            />
      </Stack>
      <Chip 
        label={req.status.charAt(0).toUpperCase() + req.status.slice(1)}
        color={req.status === 'open' ? 'warning' : req.status === 'assigned' ? 'info' : 'success'}
        sx={{ fontWeight: 600 }}
      />
    </Stack>

    {/* Description/Title */}
    <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, color: '#111' }}>
      {req.description}
    </Typography>

    {/* Status Information with Icon */}
    <Stack direction="row" alignItems="center" spacing={1} sx={{ 
      p: 1.5, 
      bgcolor: req.status === 'open' ? '#fff3cd' : req.status === 'assigned' ? '#cfe2ff' : '#d1e7dd', 
      borderRadius: 1.5,
      borderLeft: `4px solid ${req.status === 'open' ? '#ffc107' : req.status === 'assigned' ? '#0dcaf0' : '#198754'}`,
      mb: 2
    }}>
      {req.status === 'open' && <PendingActionsIcon sx={{ fontSize: 18, color: '#856404' }} />}
      {req.status === 'assigned' && <HandshakeIcon sx={{ fontSize: 18, color: '#084298' }} />}
      {req.status === 'resolved' && <DoneAllIcon sx={{ fontSize: 18, color: '#0f5132' }} />}
      <Typography variant="body2" fontWeight={600} sx={{ color: '#333' }}>
  {req.status === "open" && "Awaiting volunteer assignment"}
  {req.status === "assigned" &&
    `Assigned to ${req.assignedTo?.name || 'a volunteer'}`}
  {req.status === "resolved" &&
    `Completed by ${req.assignedTo?.name || 'a volunteer'}`}
      </Typography>
    </Stack>

    {/* Time Pending Indicator - Only for open/assigned requests */}
    {req.createdAt && req.status !== 'resolved' && (
      <Box sx={{
        p: 1.25,
        bgcolor: getTimePendingInfo(req.createdAt).color === 'success' ? '#e8f5e9' : 
                 getTimePendingInfo(req.createdAt).color === 'warning' ? '#fff3e0' : '#ffebee',
        borderRadius: 1.5,
        borderLeft: `3px solid ${
          getTimePendingInfo(req.createdAt).color === 'success' ? '#2e7d32' :
          getTimePendingInfo(req.createdAt).color === 'warning' ? '#f57c00' : '#d32f2f'
        }`,
        mb: 2
      }}>
        <Typography variant="body2" sx={{ 
          fontWeight: 600,
          color: getTimePendingInfo(req.createdAt).color === 'success' ? '#1b5e20' : 
                 getTimePendingInfo(req.createdAt).color === 'warning' ? '#e65100' : '#b71c1c'
        }}>
          {getTimePendingInfo(req.createdAt).icon} {getTimePendingInfo(req.createdAt).text}
        </Typography>
      </Box>
    )}

    {/* Location Information */}
    {req.location?.address && (
      <Typography variant="body2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, color: '#555' }}>
        <MapIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <span><strong>Location:</strong> {req.location.address}</span>
      </Typography>
    )}

    {/* Action Button */}
    {!showResolvedOnly && req.status === "assigned" && (
      <Button
        variant="contained"
        color="primary"
        size="small"
        startIcon={<MapIcon />}
        sx={{ 
          mt: 1.5, 
          borderRadius: 1.5,
          textTransform: 'none',
          fontWeight: 600,
          py: 0.75
        }}
        onClick={() => setSelectedRequestId(req._id)}
      >
        Track Volunteer Location
      </Button>
    )}

    {req.status === "resolved" && !req.isRated && (
      <Button
        variant="contained"
        color="success"
        size="small"
        startIcon={<RateReviewOutlinedIcon />}
        sx={{ 
          mt: 1.5, 
          borderRadius: 1.5,
          textTransform: 'none',
          fontWeight: 600,
          py: 0.75
        }}
        onClick={() => {
          setSelectedRequestForRating(req);
          setRatingDialogOpen(true);
        }}
      >
        Rate Volunteer
      </Button>
    )}

    {req.status === "resolved" && req.isRated && (
      <Chip
        label="Rated ✓"
        color="success"
        variant="outlined"
        sx={{ mt: 1.5 }}
      />
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
<Box sx={{ mb: 3 }}>
  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: 0.3 }}>
    My Requests Summary
  </Typography>
</Box>

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
      label="My Assigned"
      value={myAssigned}
      color="info.main"
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
<Box sx={{ mb: 3 }}>
  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: 0.3 }}>
    Community Overview
  </Typography>
</Box>

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
        <Box mt={8} mx={{ xs: -2, md: 0 }}>
          <Footer
            text={`© ${new Date().getFullYear()} Local Crisis HelpChain · User Dashboard`}
            showProfessionalLinks
          />
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

      {/* Rating Dialog */}
      {selectedRequestForRating && (
        <RatingDialog
          open={ratingDialogOpen}
          onClose={() => {
            setRatingDialogOpen(false);
            setSelectedRequestForRating(null);
          }}
          requestId={selectedRequestForRating._id}
          volunteerId={selectedRequestForRating.assignedTo._id}
          volunteerName={selectedRequestForRating.assignedTo?.name}
          onSuccess={() => {
            // Reload requests to show updated state
            setLoading(true);
            // The API call will fetch updated requests
          }}
        />
      )}
    </Box>
  );
}

export default UserDashboard;
