import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Divider, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, Snackbar, Alert
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from "socket.io-client";

import GroupsIcon from '@mui/icons-material/Groups';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AssignVolunteerDialog from '../components/AssignVolunteerDialog';
import Footer from '../components/Footer';


const socket = io(process.env.REACT_APP_API_URL);


function NGODashboard() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [requests, setRequests] = useState([]);
  const [volunteerNames, setVolunteerNames] = useState({});
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningRequestId, setAssigningRequestId] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // ================= FETCH REQUESTS =================
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/requests');
        const list = Array.isArray(data) ? data : [];
        const nameMap = {};
        list.forEach(r => {
          if (r?.assignedTo?.name) {
            nameMap[r.assignedTo._id] = r.assignedTo.name;
          }
        });
        setVolunteerNames(nameMap);
        setRequests(list);
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    })();
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

  // ================= FILTERING =================
  const filteredRequests = requests.filter(req => {
    const t = typeFilter ? req.type === typeFilter : true;
    const u = urgencyFilter ? req.urgency === urgencyFilter : true;
    const s = statusFilter ? req.status === statusFilter : true;
    return t && u && s;
  });

  // ================= ASSIGN HANDLERS =================
  const handleOpenAssignDialog = (requestId) => {
    setAssigningRequestId(requestId);
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

  // ================= STATS =================
  const totalRequests = requests.length;
  const openRequests = requests.filter(r => r.status === 'open').length;
  const assignedRequests = requests.filter(r => r.status === 'assigned').length;
  const resolvedRequests = requests.filter(r => r.status === 'resolved').length;

  // ================= MAP =================
  const firstWithCoords = requests.find(r => r.location?.coordinates?.length === 2);
  const defaultPosition = [20.5937, 78.9629];
  const mapCenter = firstWithCoords
    ? [firstWithCoords.location.coordinates[1], firstWithCoords.location.coordinates[0]]
    : defaultPosition;

  return (
    <Box sx={{ p: 4, pb: 8, minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">NGO Dashboard</Typography>
        <Button variant="outlined" color="error" size="small" onClick={auth.logout}>Logout</Button>
      </Box>
      <Divider sx={{ my: 2 }} />   
{/* STATS */}
<Grid
  container
  spacing={2}
  sx={{ mb: 4 }}
  justifyContent="center"
>
  {[['Total', totalRequests],
    ['Open', openRequests],
    ['Assigned', assignedRequests],
    ['Resolved', resolvedRequests]
  ].map(([label, value]) => (
    <Grid
      item
      xs={6}
      key={label}
      sx={{ display: 'flex', justifyContent: 'center' }}
    >
      <Paper
        sx={{
          p: 2,
          textAlign: 'center',
          width: '100%',
          maxWidth: 140
        }}
      >
        <Typography variant="h4">{value}</Typography>
        <Typography>{label}</Typography>
      </Paper>
    </Grid>
  ))}
</Grid>



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
                <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight={600}>{req.type}</Typography>
                    <Chip label={req.urgency} size="small" />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {req.description}
                  </Typography>

                  <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip label={req.status} size="small" />
                    <Typography variant="caption">
                      Assigned: {req.assignedTo?.name || '-'}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2, textAlign: 'right' }}>
                    {req.status === 'open' && !req.assignedTo ? (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleOpenAssignDialog(req._id)}
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
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1, display: { xs: 'none', md: 'block' } }}>
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
              <TableRow key={req._id}>
                <TableCell>{req.type}</TableCell>
                <TableCell>{req.urgency}</TableCell>
                <TableCell>{req.description}</TableCell>
                <TableCell>
                  <Chip label={req.status} size="small" />
                </TableCell>
                <TableCell>
                  {req.assignedTo?.name || '-'}
                </TableCell>
                <TableCell>
                  {req.status === 'open' && !req.assignedTo ? (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleOpenAssignDialog(req._id)}
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
        onClose={handleCloseAssignDialog}
        onAssigned={handleAssignedSuccess}
      />

      {/* SNACKBAR */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleSnackbarClose}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
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
      
      <Footer text="© 2026 Local Crisis HelpChain · NGO Dashboard" />
    </Box>
  );
}

export default NGODashboard;
