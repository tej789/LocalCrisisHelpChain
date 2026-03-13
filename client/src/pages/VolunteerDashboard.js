import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, Typography, Select, MenuItem, InputLabel, FormControl, Button, Chip, Box, Paper, Divider, Snackbar, Alert, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Drawer, IconButton, AppBar, Toolbar, Container, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import MenuIcon from '@mui/icons-material/Menu';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import HomeIcon from '@mui/icons-material/Home';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DirectionsIcon from '@mui/icons-material/Directions';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import NavigationIcon from '@mui/icons-material/Navigation';
// removed useNavigate; volunteers don't file requests from this dashboard
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Footer from '../components/Footer';

const socket = io(process.env.REACT_APP_API_URL);

// Custom Leaflet Icons
const volunteerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Static request icons (same size for normal and selected)
const requestIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance.toFixed(2); // Return distance in km with 2 decimal places
};

// MapController component to handle dynamic map centering
const MapController = ({ center, zoom, shouldFitBounds, bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (shouldFitBounds && bounds) {
      // Auto-zoom to show both volunteer and request with route
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center && center.length === 2) {
      // Smoothly fly to the new center with animation
      map.flyTo(center, zoom, {
        duration: 1.5, // Animation duration in seconds
        easeLinearity: 0.25
      });
    }
  }, [center, zoom, map, shouldFitBounds, bounds]);

  return null;
};

const typeIcons = {
  food: <RestaurantIcon color="primary" />,
  medicine: <LocalHospitalIcon color="error" />,
  shelter: <HomeIcon color="success" />,
  rescue: <DirectionsRunIcon color="warning" />,
  other: <HelpOutlineIcon color="info" />,
};

const urgencyColors = {
  high: 'error',
  medium: 'warning',
  low: 'success',
};

const urgencyIcons = {
  high: <PriorityHighIcon fontSize="small" color="error" sx={{ mr: 0.5 }} />,
  medium: <ReportProblemIcon fontSize="small" color="warning" sx={{ mr: 0.5 }} />,
  low: <CheckCircleIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />,
};
const urgencyPriority = {
  high: 3,
  medium: 2,
  low: 1,
};


function VolunteerDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [volunteerLocation, setVolunteerLocation] = useState(null); // { lat, lng }
const navigate = useNavigate();

  // Add CSS for selected marker animation and mobile popup styling
  useEffect(() => {
    const markerStyle = document.createElement('style');
    markerStyle.id = 'volunteer-marker-style';
    markerStyle.textContent = `
      @keyframes pulse {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.1);
          opacity: 0.8;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      .selected-marker {
        animation: pulse 2s infinite;
        filter: brightness(1.2) saturate(1.3);
      }
      
      /* Mobile popup styling */
      @media (max-width: 768px) {
        .leaflet-popup-content-wrapper {
          max-width: 220px !important;
        }
        .leaflet-popup-content {
          max-width: 200px !important;
          font-size: 13px !important;
          margin: 10px 12px !important;
        }
        .leaflet-popup-tip-container {
          width: 20px !important;
          height: 10px !important;
        }
      }
    `;
    
    // Only add if not already added
    if (!document.getElementById('volunteer-marker-style')) {
      document.head.appendChild(markerStyle);
    }
    
    // Cleanup on unmount
    return () => {
      const existingStyle = document.getElementById('volunteer-marker-style');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

// Use device location and save to backend
const handleUseLocation = () => {
  if (!navigator.geolocation) {
    setSnackbar({ open: true, message: 'Geolocation not supported', severity: 'error' });
    return;
  }

  setLocLoading(true);

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;

        await api.patch('/api/volunteers/me/location', {
          latitude,
          longitude
        });

        // Update local state to trigger map re-centering
        setVolunteerLocation({ lat: latitude, lng: longitude });
        console.log('Location updated:', { lat: latitude, lng: longitude });

        setSnackbar({ open: true, message: 'Location updated successfully', severity: 'success' });
      } catch {
        setSnackbar({ open: true, message: 'Failed to update location', severity: 'error' });
      } finally {
        setLocLoading(false);
      }
    },
    () => {
      setLocLoading(false);
      setSnackbar({ open: true, message: 'Permission denied', severity: 'error' });
    }
  );
};

  // Fetch route from OSRM
  const fetchRoute = async (requestLat, requestLng, requestId) => {
    if (!volunteerLocation) return;
    
    try {
      setRouteLoading(true);
      const url = `https://router.project-osrm.org/route/v1/driving/${volunteerLocation.lng},${volunteerLocation.lat};${requestLng},${requestLat}?overview=full&geometries=geojson`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Convert GeoJSON coordinates [lng, lat] to Leaflet format [lat, lng]
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRouteCoordinates(coordinates);

        // Set distance in km
        const distanceKm = (route.distance / 1000).toFixed(2);
        setRouteDistance(distanceKm);

        // Set ETA in minutes
        const etaMinutes = Math.round(route.duration / 60);
        setRouteEta(etaMinutes);

        // Calculate bounds for auto-zoom
        const bounds = L.latLngBounds([
          [volunteerLocation.lat, volunteerLocation.lng],
          [requestLat, requestLng]
        ]);
        setMapBounds(bounds);
        setShouldFitBounds(true);

        // Reset after zoom completes
        setTimeout(() => setShouldFitBounds(false), 500);
      }
    } catch (err) {
      console.warn('Failed to fetch route:', err);
    } finally {
      setRouteLoading(false);
    }
  };

  const auth = useAuth();
  console.log('AUTH USER FROM CONTEXT:', auth?.user);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [view, setView] = useState('open'); // 'open' | 'assigned' | 'all'
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  // Availability state (frontend only)
  const [myAvailability, setMyAvailability] = useState(false);
  const [myVerified, setMyVerified] = useState(false);
  const [availLoading, setAvailLoading] = useState(false);
  // Profile state
  const [profileName, setProfileName] = useState(auth.user?.name || "");
  const profileEmail = auth.user?.email || "";
  const [profileLoading, setProfileLoading] = useState(false);
  // Backward-compatible verified check derived directly from auth.user
  const computedVerified = (auth?.user?.isVerified === true) || (auth?.user?.isVerified === undefined && auth?.user?.verified === true);
  
  // State for routing visualization
  const [selectedMapRequest, setSelectedMapRequest] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null); // For marker highlighting
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeEta, setRouteEta] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [mapBounds, setMapBounds] = useState(null); // For auto-zoom
  const [shouldFitBounds, setShouldFitBounds] = useState(false);
 
useEffect(() => {
  (async () => {
    try {
      const response = await api.get('/api/requests');
      setRequests(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  })();
}, []);

  // Get volunteer's location: prioritize GPS, fallback to backend saved location
  useEffect(() => {
    let isGPSLocationSet = false;

    // Try to get current GPS location first (preferred)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setVolunteerLocation({ lat: latitude, lng: longitude });
          isGPSLocationSet = true;
          console.log('✅ GPS location detected (current):', { lat: latitude, lng: longitude });
        },
        (error) => {
          console.warn('⚠️ GPS permission denied or unavailable:', error.message);
          // Fallback to backend saved location
          fetchBackendLocation();
        },
        {
          enableHighAccuracy: true,
          timeout: 5000, // Reduced timeout to 5s for faster fallback
          maximumAge: 0
        }
      );

      // Also set a timeout to fallback to backend if GPS takes too long
      setTimeout(() => {
        if (!isGPSLocationSet) {
          console.log('⏱️ GPS taking too long, using saved location as fallback...');
          fetchBackendLocation();
        }
      }, 3000); // Wait 3 seconds max for GPS
    } else {
      console.warn('Geolocation not supported by this browser');
      fetchBackendLocation();
    }

    // Helper function to fetch backend saved location
    async function fetchBackendLocation() {
      try {
        const response = await api.get('/api/volunteers/me');
        const volunteer = response.data.data || response.data;
        
        if (volunteer.location && volunteer.location.coordinates && volunteer.location.coordinates.length === 2) {
          const [lng, lat] = volunteer.location.coordinates;
          // Only set backend location if GPS hasn't set it yet
          setVolunteerLocation(prev => {
            if (!prev) {
              console.log('📍 Backend saved location loaded:', { lat, lng });
              return { lat, lng };
            }
            return prev; // Keep GPS location if already set
          });
        }
      } catch (err) {
        console.warn('Could not fetch volunteer location:', err.message);
      }
    }
  }, []);

  // Initialize availability and verification from auth user
  useEffect(() => {
    const u = auth?.user || {};
    const isVerified = (u.isVerified === true) || (u.isVerified === undefined && u.verified === true);
    setMyVerified(!!isVerified);
    setMyAvailability(!!u.isAvailable);
  }, [auth?.user]);

  useEffect(() => {
    socket.on('newRequest', (newRequest) => {
      setRequests(prev => [newRequest, ...prev]);
    });
    socket.on('requestClaimed', (updatedRequest) => {
      setRequests(prev => prev.map(r => r._id === updatedRequest._id ? updatedRequest : r));
    });
    socket.on('requestAssigned', (updatedRequest) => {
      setRequests(prev => prev.map(r => r._id === updatedRequest._id ? updatedRequest : r));
    });
    socket.on('requestResolved', (updatedRequest) => {
      setRequests(prev => prev.map(r => r._id === updatedRequest._id ? updatedRequest : r));
    });
    return () => {
      socket.off('newRequest');
      socket.off('requestClaimed');
      socket.off('requestAssigned');
      socket.off('requestResolved');
    };

  }, []);

  // Toggle availability for verified volunteers only
  const handleToggleAvailability = async () => {
    if (!computedVerified) {
      setSnackbar({ open: true, message: 'Only verified volunteers can change availability.', severity: 'warning' });
      return;
    }
    setAvailLoading(true);
    try {
      const desired = !myAvailability;
      const { data } = await api.patch('/api/volunteers/me/availability', { isAvailable: desired });
      setMyAvailability(!!data?.isAvailable);
      // Persist into AuthContext so state survives across app
      try {
        auth.login({ token: auth.token, user: { ...(auth.user || {}), isAvailable: !!data?.isAvailable, isVerified: data?.isVerified ?? auth?.user?.isVerified } });
      } catch {}
      setSnackbar({ open: true, message: data?.isAvailable ? 'You are now Available.' : 'You are now Offline.', severity: 'success' });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) setSnackbar({ open: true, message: 'Only verified volunteers can change availability.', severity: 'error' });
      else if (status === 400) setSnackbar({ open: true, message: err.response?.data?.error || 'Invalid request.', severity: 'error' });
      else setSnackbar({ open: true, message: 'Failed to update availability.', severity: 'error' });
    } finally {
      setAvailLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    try {
      const { data } = await api.patch("/api/volunteers/me/basic", {
        name: profileName
      });

      auth.login({
        token: auth.token,
        user: { ...auth.user, name: data.name }
      });

      setSnackbar({ open: true, message: "Name updated successfully", severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || "Update failed", severity: 'error' });
    }
    setProfileLoading(false);
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const typeMatch = typeFilter ? req.type === typeFilter : true;
      const urgencyMatch = urgencyFilter ? req.urgency === urgencyFilter : true;
      
      // Filter by distance (50km radius) if volunteer location is available
      // Increased from 20km to 50km to show more requests
      let distanceMatch = true;
      if (volunteerLocation && req.location && req.location.coordinates && req.location.coordinates.length === 2) {
        const reqLat = req.location.coordinates[1];
        const reqLng = req.location.coordinates[0];
        const distance = parseFloat(calculateDistance(
          volunteerLocation.lat,
          volunteerLocation.lng,
          reqLat,
          reqLng
        ));
        distanceMatch = distance <= 50; // Show requests within 50 km
      }
      
      return typeMatch && urgencyMatch && distanceMatch;
    });
  }, [requests, typeFilter, urgencyFilter, volunteerLocation]);

const sortedRequests = useMemo(() => {
  return [...filteredRequests].sort((a, b) => {
    const ua = urgencyPriority[a.urgency?.toLowerCase()] || 0;
    const ub = urgencyPriority[b.urgency?.toLowerCase()] || 0;
    return ub - ua; // high first
  });
}, [filteredRequests]);


 const openRequests = sortedRequests.filter(r => (r.status || 'open') === 'open');
  // Show requests assigned to the logged-in volunteer (by userId)
  const myAssignedRequests = sortedRequests.filter(r => {
    const status = r.status || 'open';
    if (status !== 'assigned' && status !== 'resolved') return false;
  
    const myId = auth.user?.id || auth.user?._id;
    if (!myId) return false;
  
    // assignedTo can be ObjectId string OR populated object
    if (typeof r.assignedTo === 'string') {
      return r.assignedTo === myId;
    }
  
    if (typeof r.assignedTo === 'object' && r.assignedTo?._id) {
      return r.assignedTo._id === myId;
    }
  
    return false;
  }


);
  // Separate active and resolved
const activeAssignedRequests = myAssignedRequests.filter(
  r => r.status === 'assigned'
);

const resolvedRequests = myAssignedRequests.filter(
  r => r.status === 'resolved'
);

// Final displayed list
const displayedRequests =
  view === 'assigned'
    ? activeAssignedRequests
    : view === 'resolved'
    ? resolvedRequests
    : activeAssignedRequests;

// Debug logging for map rendering
console.log('Map Debug:', {
  view,
  totalRequests: requests.length,
  myAssignedRequests: myAssignedRequests.length,
  activeAssignedRequests: activeAssignedRequests.length,
  displayedRequests: displayedRequests.length,
  displayedRequestsWithLocation: displayedRequests.filter(r => r.location && r.location.coordinates && r.location.coordinates.length === 2).length
});

  // Legacy claim dialog removed; volunteers claim directly

  // Minimal change: volunteer self-claim uses JWT identity; no name/contact needed
  const handleClaimSelf = async (requestId) => {
    setActionLoading(true);
    try {
      await api.post(`/api/requests/${requestId}/claim/self`);
      setSnackbar({ open: true, message: 'Request claimed successfully!', severity: 'success' });
      // Optimistically update local state so it appears in "My Assigned" immediately
      setRequests(prev => prev.map(r => r._id === requestId ? { ...r, status: 'assigned', assignedTo: auth.user?.id } : r));
      // Ensure server state is synced (in case other fields changed) and switch to 'assigned' view
      try {
      const response = await api.get('/api/requests');

if (Array.isArray(response.data.data)) {
  setRequests(response.data.data);
} else {
  setRequests([]);
}
      } catch {}
      setView('assigned');
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to claim request.', severity: 'error' });
    }
    setActionLoading(false);
  };

  const handleResolve = async (requestId) => {
    setActionLoading(true);
    try {
      await api.post(`/api/requests/${requestId}/resolve`);
      setSnackbar({ open: true, message: 'Request marked as resolved!', severity: 'success' });
      // Optimistically update to resolved
      setRequests(prev => prev.map(r => r._id === requestId ? { ...r, status: 'resolved' } : r));
      // Refetch to ensure full sync
      try {
       const response = await api.get('/api/requests');

if (Array.isArray(response.data.data)) {
  setRequests(response.data.data);
} else {
  setRequests([]);
}
      } catch {}
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to resolve request.', severity: 'error' });
    }
    setActionLoading(false);
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenDetailsDialog = (request) => {
    setSelectedRequest(request);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
    // Don't clear selectedRequest - keep it for reference
    // This allows the map marker and route to remain visible
  };

  if (loading) return <p>Loading requests...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  // Get unique types and urgencies for filter dropdowns
  const uniqueTypes = Array.from(new Set(requests.map((req) => req.type))).filter(Boolean);
  const uniqueUrgencies = Array.from(new Set(requests.map((req) => req.urgency))).filter(Boolean);

  // Map center: prioritize volunteer location, then first request, then default (Vadodara)
  const defaultPosition = [22.3072, 73.1812]; // Vadodara, Gujarat
  let mapCenter = defaultPosition;
  
  if (volunteerLocation) {
    mapCenter = [volunteerLocation.lat, volunteerLocation.lng];
  } else {
    const firstWithCoords = filteredRequests.find(r => r.location && r.location.coordinates && r.location.coordinates.length === 2);
    if (firstWithCoords) {
      mapCenter = [firstWithCoords.location.coordinates[1], firstWithCoords.location.coordinates[0]];
    }
  }

const whatsappMessage = selectedRequest
  ? encodeURIComponent(
      `Hello ${selectedRequest.name}, 
I am the assigned volunteer from Local Crisis HelpChain regarding your ${selectedRequest.type} request. 
I will reach you shortly.`
    )
  : '';
  return (
    <Box
  sx={{
    p: { xs: 1, md: 4 },
    minHeight: '100vh',
    backgroundColor: 'background.default',
    display: 'flex',
    flexDirection: 'column'
  }}
>
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
      Volunteer Dashboard
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

  <Container maxWidth="lg">
  {/* Welcome Box - Same as User Dashboard */}
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
    <VolunteerActivismIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />

    {/* Title */}
    <Typography variant="h5" fontWeight={700} gutterBottom>
      Welcome to Volunteer Dashboard
    </Typography>

    {/* Subtitle */}
    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
      View assigned requests and help resolve crisis situations in your community
    </Typography>

    {/* View filters */}
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%'
      }}
    >
      <Button
        variant={view === 'assigned' ? 'contained' : 'outlined'}
        size="large"
        onClick={() => setView('assigned')}
        sx={{ px: 4, fontWeight: 600 }}
      >
        My Active
      </Button>

      <Button
        variant={view === 'resolved' ? 'contained' : 'outlined'}
        size="large"
        onClick={() => setView('resolved')}
        sx={{ px: 4, fontWeight: 600 }}
      >
        My Resolved
      </Button>
    </Box>
  </Paper>

       <Divider sx={{ my: 2 }} />
<Stack
  direction="row"
  spacing={2}
  justifyContent="center"
  mb={2}
  flexWrap="wrap"
>
  <Chip
  label={`Active: ${activeAssignedRequests.length}`}
  color="primary"
  sx={{ fontWeight: 600, px: 1 }}
/>


  <Chip
    label={`Resolved: ${resolvedRequests.length}`}
    color="success"
  />

  <Chip
    label={`Total: ${myAssignedRequests.length}`}
  />
</Stack>
<Box sx={{ mb: 3, maxWidth: 900, mx: 'auto' }}>

<Paper
  elevation={2}
  sx={{
    p: 2,
    mb: 2,
    display: 'flex',
    gap: 2,
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.02)'
  }}
>
          <FormControl variant="standard" sx={{ minWidth: 140 }}>
            <InputLabel>Type</InputLabel>
            <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} label="Type">
              <MenuItem value="">All Types</MenuItem>
              {uniqueTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="standard" sx={{ minWidth: 140 }}>
            <InputLabel>Urgency</InputLabel>
            <Select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)} label="Urgency">
              <MenuItem value="">All Urgencies</MenuItem>
              {uniqueUrgencies.map(urgency => (
                <MenuItem key={urgency} value={urgency}>{urgency}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
        <Grid container spacing={3}>
{displayedRequests.length === 0 && (           <Grid item xs={12}>

              <Paper elevation={1} sx={{ p: 5, textAlign: 'center', background: '#f5f7fa' }}>
                <SentimentSatisfiedAltIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">No {view === 'assigned'
      ? 'active requests'
      : 'resolved requests'} found.</Typography>
              </Paper>
            </Grid>
          )}
{displayedRequests.map((req) => (            <Grid item xs={12} sm={6} md={4} key={req._id || req.id}>
              <Card
                variant="outlined"
                sx={{
  mb: 2,
  minHeight: { xs: 'auto', md: 340 },
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',

  boxShadow:
    req.urgency?.toLowerCase() === 'high' &&
    (req.status || 'open') === 'open'
      ? 10
      : 4,

  borderRadius: 4,

  border:
    req.urgency?.toLowerCase() === 'high' &&
    (req.status || 'open') === 'open'
      ? '2px solid #d32f2f'
      : '1px solid rgba(0,0,0,0.12)',

  background:
    req.urgency?.toLowerCase() === 'high' &&
    (req.status || 'open') === 'open'
      ? 'rgba(211,47,47,0.05)'
      : '#fff',

  transition: 'box-shadow 0.2s, transform 0.2s',

  '&:hover': {
    boxShadow: 12,
    transform: 'translateY(-4px)'
  },

  p: 0,
}}


              >
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                    <Box sx={{ fontSize: 44 }}>
                      {typeIcons[req.type?.toLowerCase()] || <HelpOutlineIcon color="disabled" sx={{ fontSize: 44 }} />}
                    </Box>
                    <Box>
                      <Typography variant="h6" color="primary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                        {req.type}
                      </Typography>
                      <Chip
                        label={req.urgency?.charAt(0).toUpperCase() + req.urgency?.slice(1)}
                        color={urgencyColors[req.urgency?.toLowerCase()] || 'default'}
                        size="small"
                        icon={urgencyIcons[req.urgency?.toLowerCase()]}
                        sx={{ fontWeight: 600, ml: 1 }}
                      />
                    </Box>
                  </Stack>
                  <Typography
  variant="body1"
  sx={{
    mb: 1,
    fontWeight: 500,
    minHeight: 48,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  }}
>

                    {req.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Location:</strong> {req.location?.address
                      ? req.location.address
                      : (req.location && req.location.coordinates && req.location.coordinates.length === 2
                          ? `Lat: ${req.location.coordinates[1]}, Lng: ${req.location.coordinates[0]}`
                          : 'N/A')}
                  </Typography>
                 <Box sx={{ mb: 1 }}>
  <strong>Status: </strong>
  <Chip
    label={req.status || 'open'}
    color={
      req.status === 'resolved'
        ? 'success'
        : req.status === 'assigned'
        ? 'primary'
        : 'warning'
    }
    size="small"
    sx={{ ml: 1 }}
  />
</Box>

                </CardContent>
                <Box sx={{ px: 3, pb: 2, pt: 0, display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Button variant="outlined" size="small" onClick={() => handleOpenDetailsDialog(req)}>
                    View Details
                  </Button>
                  {false && ((req.status || 'open') === 'open') && ( // hidden to enforce NGO-controlled assignment
                    <Button variant="contained" size="small" onClick={() => handleClaimSelf(req._id)} disabled={actionLoading} sx={{ fontWeight: 600 }}>
                      Claim
                    </Button>
                  )}
                 {((req.status || 'open') === 'assigned') &&
 auth.user?.role === 'volunteer' &&
 auth.user?.id &&
 (
   req.assignedTo === auth.user.id ||
   req.assignedTo?._id === auth.user.id
 ) && (
   <Button
     variant="contained"
     color="success"
     size="small"
     onClick={() => handleResolve(req._id)}
     disabled={actionLoading}
     sx={{ fontWeight: 600 }}
   >
     Mark as Resolved
   </Button>
)}

                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
      {/* Map at the bottom */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: { xs: 1.5, sm: 2 }, 
          mt: 4, 
          width: '100%', 
          borderRadius: { xs: 1.5, sm: 2 }, 
          boxShadow: 1 
        }}
      >
        {/* Map Header - Stack on mobile */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' }, 
            justifyContent: { xs: 'flex-start', sm: 'space-between' }, 
            gap: { xs: 1, sm: 0 },
            mb: 2 
          }}
        >
          <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            Live Request Map {volunteerLocation && (
              <Chip 
                label="Your Location Detected" 
                color="primary" 
                size="small" 
                sx={{ ml: 1, display: { xs: 'none', sm: 'inline-flex' } }} 
              />
            )}
          </Typography>
          <Chip 
            label={`My Assigned Requests: ${displayedRequests.filter(r => r.location && r.location.coordinates && r.location.coordinates.length === 2).length}`}
            color="secondary"
            variant="outlined"
            size="medium"
            sx={{ 
              fontWeight: 600,
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'center', sm: 'flex-start' }
            }}
          />
        </Box>
        
        {/* Distance and ETA badges - Stack vertically on mobile */}
        {routeDistance && routeEta && (
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={1} 
            sx={{ mb: 2 }}
          >
            <Chip
              icon={<DirectionsIcon />}
              label={`Distance: ${routeDistance} km`}
              color="primary"
              variant="outlined"
              size="small"
              sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-start', sm: 'center' } }}
            />
            <Chip
              icon={<AccessTimeIcon />}
              label={`ETA: ${routeEta} min`}
              color="success"
              variant="outlined"
              size="small"
              sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-start', sm: 'center' } }}
            />
          </Stack>
        )}
        
        {/* Navigate in Google Maps button - Full width on mobile */}
        {selectedMapRequest && volunteerLocation && (
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<NavigationIcon />}
            href={`https://www.google.com/maps/dir/?api=1&origin=${volunteerLocation.lat},${volunteerLocation.lng}&destination=${selectedMapRequest.location.coordinates[1]},${selectedMapRequest.location.coordinates[0]}&travelmode=driving`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ 
              mb: 2, 
              textTransform: 'none', 
              fontWeight: 600,
              width: { xs: '100%', sm: 'auto' },
              justifyContent: 'center'
            }}
          >
            Navigate in Google Maps
          </Button>
        )}
        
        <Box sx={{ 
          height: { xs: 300, sm: 350, md: 450 }, 
          width: '100%',
          borderRadius: { xs: 1.5, sm: 2 },
          overflow: 'hidden'
        }}>
          <MapContainer center={mapCenter} zoom={volunteerLocation ? 12 : 6} style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Dynamic map controller - smoothly centers map when volunteer location changes or auto-zooms to route */}
            <MapController 
              center={mapCenter} 
              zoom={volunteerLocation ? 12 : 6} 
              shouldFitBounds={shouldFitBounds}
              bounds={mapBounds}
            />
            
            {/* Route Polyline */}
            {routeCoordinates.length > 0 && (
              <Polyline
                positions={routeCoordinates}
                color="#2196f3"
                weight={4}
                opacity={0.7}
              />
            )}
            
            {/* Volunteer Location Marker (Blue) */}
            {volunteerLocation && (
              <Marker
                position={[volunteerLocation.lat, volunteerLocation.lng]}
                icon={volunteerIcon}
              >
                <Popup>
                  <Typography variant="subtitle1" fontWeight={600} color="primary">
                    📍 Your Location
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Lat: {volunteerLocation.lat.toFixed(4)}, Lng: {volunteerLocation.lng.toFixed(4)}
                  </Typography>
                </Popup>
              </Marker>
            )}

            {/* Crisis Request Markers (Red) - Show only assigned requests for this volunteer */}
            {displayedRequests
              .filter(r => {
                // Enhanced filtering with logging
                if (!r.location) {
                  console.warn('Request missing location:', r._id);
                  return false;
                }
                if (!r.location.coordinates) {
                  console.warn('Request missing coordinates:', r._id);
                  return false;
                }
                if (r.location.coordinates.length !== 2) {
                  console.warn('Request invalid coordinates length:', r._id, r.location.coordinates);
                  return false;
                }
                return true;
              })
              .map((req) => {
                try {
                  const reqLat = req.location.coordinates[1];
                  const reqLng = req.location.coordinates[0];
                  
                  // Prevent crashes if lat or lng is invalid
                  if (!reqLat || !reqLng || isNaN(reqLat) || isNaN(reqLng)) {
                    console.warn('Invalid lat/lng for request:', req._id, { lat: reqLat, lng: reqLng });
                    return null;
                  }

                  // Calculate distance if volunteer location is available
                  let distance = null;
                  if (volunteerLocation) {
                    distance = calculateDistance(
                      volunteerLocation.lat,
                      volunteerLocation.lng,
                      reqLat,
                      reqLng
                    );
                  }

                  console.log('Rendering marker for request:', req._id, { lat: reqLat, lng: reqLng, distance });

                  return (
              <Marker
                key={req._id || req.id}
                position={[reqLat, reqLng]}
                icon={requestIcon} // Use single static icon - always visible
                eventHandlers={{
                  click: () => {
                    // Only update map state for route visualization
                    // Don't open Details Dialog - let the popup show instead
                    setSelectedMapRequest(req);
                    if (volunteerLocation) {
                      fetchRoute(reqLat, reqLng, req._id);
                    }
                  }
                }}
              >
                <Popup>
                  <Box sx={{ minWidth: 150, maxWidth: 200 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      🚨 {req.type || 'Request'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      ⚠ {req.urgency || 'N/A'}
                    </Typography>
                    {distance && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        📏 ~{distance} km (straight-line)
                      </Typography>
                    )}
                    {/* Show OSRM distance if this request is selected and route is calculated */}
                    {selectedMapRequest && selectedMapRequest._id === req._id && routeDistance && (
                      <Typography variant="caption" color="primary" fontWeight={600} display="block">
                        �️ {routeDistance} km (driving)
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                      Click marker for route
                    </Typography>
                  </Box>
                </Popup>
              </Marker>
                );
                } catch (error) {
                  console.error('Error rendering marker for request:', req._id, error);
                  return null;
                }
              })}
          </MapContainer>
        </Box>
      </Paper>
      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={handleCloseDetailsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Request Details</DialogTitle>
        <DialogContent dividers>
          {selectedRequest && (
            <Box>
              <Typography variant="subtitle1" gutterBottom><strong>Type:</strong> {selectedRequest.type}</Typography>
              <Typography variant="subtitle1" gutterBottom><strong>Urgency:</strong> {selectedRequest.urgency}</Typography>
              <Typography variant="subtitle1" gutterBottom><strong>Description:</strong> {selectedRequest.description}</Typography>
              <Typography variant="subtitle1" gutterBottom><strong>Name:</strong> {selectedRequest.name}</Typography>
              {/* <Typography variant="subtitle1" gutterBottom><strong>Contact:</strong> {selectedRequest.contact}</Typography> */}
              {selectedRequest.status === 'assigned'&&
 selectedRequest?.contact &&
 auth.user?.id &&
 (
   selectedRequest.assignedTo === auth.user.id ||
   selectedRequest.assignedTo?._id === auth.user.id
 ) && (
   <Box sx={{ mt: 2 }}>
     <Typography variant="subtitle1" gutterBottom>
       <strong>Contact:</strong> {selectedRequest.contact}
     </Typography>

     <Stack direction="row" spacing={2} mt={1}>
  {/* Call */}
  <Button
    variant="contained"
    color="primary"
    size="small"
    component="a"
    href={`tel:${selectedRequest.contact}`}
    startIcon={<PhoneIcon />}
  >
    Call
  </Button>

  {/* WhatsApp */}
<Button
  variant="contained"
  color="success"
  size="small"
  component="a"
  target="_blank"
  rel="noopener noreferrer"
href={`https://wa.me/${selectedRequest.contact}?text=${whatsappMessage}`}  startIcon={<WhatsAppIcon />}
>
  WhatsApp
</Button>
</Stack>
   </Box>
 )}
              <Typography variant="subtitle1" gutterBottom><strong>Location:</strong> {selectedRequest.location?.address
                ? selectedRequest.location.address
                : (selectedRequest.location && selectedRequest.location.coordinates && selectedRequest.location.coordinates.length === 2
                    ? `Lat: ${selectedRequest.location.coordinates[1]}, Lng: ${selectedRequest.location.coordinates[0]}`
                    : 'N/A')}
              </Typography>
              <Typography variant="subtitle1" gutterBottom><strong>Status:</strong> {selectedRequest.status}</Typography>
              {selectedRequest.claimedBy && selectedRequest.claimedBy.name && (
                <Typography variant="subtitle1" gutterBottom><strong>Claimed By:</strong> {selectedRequest.claimedBy.name}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedRequest && selectedRequest.location && selectedRequest.location.coordinates && selectedRequest.location.coordinates.length === 2 && volunteerLocation && (
            <Button 
              variant="outlined" 
              color="primary"
              startIcon={<DirectionsIcon />}
              onClick={() => {
                const reqLat = selectedRequest.location.coordinates[1];
                const reqLng = selectedRequest.location.coordinates[0];
                setSelectedMapRequest(selectedRequest);
                fetchRoute(reqLat, reqLng, selectedRequest._id);
              }}
            >
              Show Route
            </Button>
          )}
          <Button onClick={handleCloseDetailsDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Profile Dialog */}
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
            Volunteer Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your account
          </Typography>
        </Box>

        <TextField
          fullWidth
          size="small"
          label="Name"
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          size="small"
          label="Email"
          value={profileEmail}
          disabled
          sx={{ mb: 3 }}
        />

        <Button
          fullWidth
          variant="contained"
          sx={{ mb: 3, fontWeight: 600 }}
          onClick={handleSaveProfile}
          disabled={profileLoading}
        >
          Save Changes
        </Button>

        <Box textAlign="center" mb={2}>
          <Typography variant="body2">
            Status:{" "}
            <span
              style={{
                color: myAvailability ? "#2e7d32" : "#d32f2f",
                fontWeight: 600
              }}
            >
              {myAvailability ? "Available" : "Offline"}
            </span>
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          size="medium"
          sx={{ mb: 2 }}
          onClick={handleToggleAvailability}
          disabled={availLoading}
        >
          {myAvailability ? "Go Offline" : "Go Available"}
        </Button>

        <Button
          fullWidth
          variant="outlined"
          size="medium"
          sx={{ mb: 2 }}
          onClick={handleUseLocation}
          disabled={locLoading}
        >
          Use My Location
        </Button>

        <Button
          fullWidth
          variant="outlined"
          sx={{ mb: 0 }}
          onClick={() => setProfileOpen(false)}
        >
          Close
        </Button>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
     {/* Footer */}
<Footer text="© 2026 Local Crisis HelpChain · Volunteer Dashboard" />
    </Container>
    </Box>
  );
}

export default VolunteerDashboard; 