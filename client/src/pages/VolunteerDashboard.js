
import React, { useEffect, useState, useMemo } from 'react';

import { Card, CardContent, Typography, Select, MenuItem, InputLabel, FormControl, Button, Chip, Box, Paper, Divider, Snackbar, Alert, Stack, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Grid from '@mui/material/Grid';
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
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from "socket.io-client";

// removed useNavigate; volunteers don't file requests from this dashboard
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Footer from '../components/Footer';

const socket = io(process.env.REACT_APP_API_URL);


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

function VolunteerDashboard() {
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
  // Backward-compatible verified check derived directly from auth.user
  const computedVerified = (auth?.user?.isVerified === true) || (auth?.user?.isVerified === undefined && auth?.user?.verified === true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/requests');
        setRequests(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch requests');
      } finally {
        setLoading(false);
      }
    })();
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

  const filteredRequests = useMemo(() => {
  return requests.filter((req) => {
    const typeMatch = typeFilter ? req.type === typeFilter : true;
    const urgencyMatch = urgencyFilter ? req.urgency === urgencyFilter : true;
    return typeMatch && urgencyMatch;
  });
}, [requests, typeFilter, urgencyFilter]);


  const openRequests = filteredRequests.filter(r => (r.status || 'open') === 'open');
  // Show requests assigned to the logged-in volunteer (by userId)
  const myAssignedRequests = filteredRequests.filter(r => {
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
        const { data } = await api.get('/api/requests');
        setRequests(Array.isArray(data) ? data : []);
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
        const { data } = await api.get('/api/requests');
        setRequests(Array.isArray(data) ? data : []);
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
    setSelectedRequest(null);
  };

  if (loading) return <p>Loading requests...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  // Get unique types and urgencies for filter dropdowns
  const uniqueTypes = Array.from(new Set(requests.map((req) => req.type))).filter(Boolean);
  const uniqueUrgencies = Array.from(new Set(requests.map((req) => req.urgency))).filter(Boolean);

  // Find the first request with coordinates for map center, or use a default
  const firstWithCoords = filteredRequests.find(r => r.location && r.location.coordinates && r.location.coordinates.length === 2);
  const defaultPosition = [20.5937, 78.9629]; // Center of India as a fallback
  const mapCenter = firstWithCoords ? [firstWithCoords.location.coordinates[1], firstWithCoords.location.coordinates[0]] : defaultPosition;

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
{/* Header */}

<Box
  sx={{
    display: "flex",
    flexDirection: { xs: "column", sm: "row" },
    alignItems: "center",
    justifyContent: "space-between",
    mb: 2,
    gap: 1,
    textAlign: "center"
  }}
>

  <Typography
    variant="h4"
    sx={{
      textAlign: "center",
      width: "100%"
    }}
  >
    Volunteer Dashboard
  </Typography>

  <Button
    variant="outlined"
    color="error"
    size="small"
    onClick={auth.logout}
    sx={{
      alignSelf: { xs: "flex-end", sm: "auto" }
    }}
  >
    Logout
  </Button>
</Box>


  {/* Intro Section */}
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      mb: 2
    }}
  >
    <VolunteerActivismIcon
      sx={{ fontSize: 56, color: 'primary.main', mb: 1 }}
    />

    <Typography
      variant="h6"
      color="text.secondary"
      align="center"
      gutterBottom
    >
      Help your community by claiming and resolving real-time requests
    </Typography>

    {/* View filters */}
   <Box
  sx={{
    mt: 2,
    display: 'flex',
    gap: 1,
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%'
  }}
>

      <Button
      sx={{ flex: { xs: '1 1 100%', sm: 'unset' } }}
        variant={view === 'all' ? 'contained' : 'outlined'}
        onClick={() => setView('all')}
      >
        View All Requests
      </Button>

      <Button
      sx={{ flex: { xs: '1 1 100%', sm: 'unset' } }}
        variant={view === 'open' ? 'contained' : 'outlined'}
        onClick={() => setView('open')}
      >
        See Open Requests
      </Button>

      <Button
      sx={{ flex: { xs: '1 1 100%', sm: 'unset' } }}
        variant={view === 'assigned' ? 'contained' : 'outlined'}
        onClick={() => setView('assigned')}
      >
        My Assigned
      </Button>
    </Box>

    {/* Availability control */}
    {computedVerified && (
      <Box
        sx={{
          mt: 2,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}
      >
        <Typography variant="body1">
          Status: <strong>{myAvailability ? 'Available' : 'Offline'}</strong>
        </Typography>

        <Button
          variant={myAvailability ? 'outlined' : 'contained'}
          color={myAvailability ? 'warning' : 'success'}
          onClick={handleToggleAvailability}
          disabled={availLoading}
        >
          {availLoading
            ? 'Updating...'
            : myAvailability
            ? 'Go Offline'
            : 'Go Available'}
        </Button>
      </Box>
    )}
  </Box>
       <Divider sx={{ my: 2 }} />

<Stack direction="row" spacing={2} justifyContent="center" mb={2} flexWrap="wrap">
  <Chip label={`Open: ${openRequests.length}`} color="warning" />
  <Chip label={`Assigned: ${myAssignedRequests.length}`} color="primary" />
  <Chip label={`Total: ${filteredRequests.length}`} />
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
          {((view === 'open' ? openRequests : view === 'assigned' ? myAssignedRequests : filteredRequests).length === 0) && (
           <Grid item xs={12}>

              <Paper elevation={1} sx={{ p: 5, textAlign: 'center', background: '#f5f7fa' }}>
                <SentimentSatisfiedAltIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">No {view === 'open' ? 'open' : view === 'assigned' ? 'assigned' : 'requests'} found.</Typography>
              </Paper>
            </Grid>
          )}
          {(view === 'open' ? openRequests : view === 'assigned' ? myAssignedRequests : filteredRequests).map((req) => (
            <Grid item xs={12} sm={6} md={4} key={req._id || req.id}>
              <Card
                variant="outlined"
                sx={{
                  mb: 2,
                  minHeight: { xs: 'auto', md: 340 },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 4,
                  borderRadius: 4,
                  transition: 'box-shadow 0.2s, transform 0.2s',
                 '&:hover': {
    boxShadow: 10,
    transform: 'translateY(-4px)'
  },
                  p: 0,
                  background: '#fff',
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
      <Paper elevation={1} sx={{ p: 2, mt: 4, width: '100%', borderRadius: 2, boxShadow: 1 }}>
        <Typography variant="h6" gutterBottom>Live Request Map</Typography>
        <Box sx={{ height: { xs: 240, md: 450 }, width: '100%' }}>
          <MapContainer center={mapCenter} zoom={6} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filteredRequests.filter(r => r.location && r.location.coordinates && r.location.coordinates.length === 2).map((req) => (
              <Marker
                key={req._id || req.id}
                position={[req.location.coordinates[1], req.location.coordinates[0]]}
              >
                <Popup>
                  <Typography variant="subtitle1"><strong>{req.type}</strong> ({req.urgency})</Typography>
                  <Typography variant="body2">{req.description}</Typography>
                  <Typography variant="caption">{req.location?.address || JSON.stringify(req.location)}</Typography>
                </Popup>
              </Marker>
            ))}
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
              <Typography variant="subtitle1" gutterBottom><strong>Contact:</strong> {selectedRequest.contact}</Typography>
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
          <Button onClick={handleCloseDetailsDialog}>Close</Button>
        </DialogActions>
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

    </Box>
  );
}

export default VolunteerDashboard; 