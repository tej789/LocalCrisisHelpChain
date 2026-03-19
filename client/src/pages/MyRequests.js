import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Alert
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  PendingActions as PendingIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import UserLayout from '../components/user/UserLayout';

function MyRequests() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, open, assigned, resolved

  useEffect(() => {
    fetchMyRequests();
  }, [auth?.token]);

  // Sync filter with optional status query param (e.g. ?status=resolved)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status === 'open' || status === 'assigned' || status === 'resolved') {
      setFilter(status);
    } else {
      setFilter('all');
    }
  }, [location.search]);

  const fetchMyRequests = async () => {
    try {
      const { data } = await api.get('/api/requests');
      setMyRequests(data.myRequests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setMyRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setViewDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setViewDialogOpen(false);
    setSelectedRequest(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'warning';
      case 'assigned':
        return 'info';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const filteredRequests = myRequests.filter((req) => {
    if (filter === 'all') {
      // In the default "My Requests" view, hide resolved requests
      return req.status !== 'resolved';
    }
    return req.status === filter;
  });

  const stats = {
    total: myRequests.length,
    open: myRequests.filter((r) => r.status === 'open').length,
    assigned: myRequests.filter((r) => r.status === 'assigned').length,
    resolved: myRequests.filter((r) => r.status === 'resolved').length,
  };

  if (loading) {
    return (
      <UserLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={4}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              My Requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track and manage all your help requests
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/submit-request')}
            sx={{
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
            }}
          >
            + New Request
          </Button>
        </Stack>

        {/* Stats Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: filter === 'all' ? 'primary.main' : 'white',
                color: filter === 'all' ? 'white' : 'inherit',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                },
              }}
              onClick={() => setFilter('all')}
            >
              <AssignmentIcon sx={{ fontSize: 40, mb: 1, opacity: 0.8 }} />
              <Typography variant="h4" fontWeight={700}>
                {stats.total}
              </Typography>
              <Typography variant="body2">Total Requests</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: filter === 'open' ? 'warning.main' : 'white',
                color: filter === 'open' ? 'white' : 'inherit',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                },
              }}
              onClick={() => setFilter('open')}
            >
              <PendingIcon sx={{ fontSize: 40, mb: 1, opacity: 0.8 }} />
              <Typography variant="h4" fontWeight={700}>
                {stats.open}
              </Typography>
              <Typography variant="body2">Open</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: filter === 'assigned' ? 'info.main' : 'white',
                color: filter === 'assigned' ? 'white' : 'inherit',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                },
              }}
              onClick={() => setFilter('assigned')}
            >
              <AssignmentIcon sx={{ fontSize: 40, mb: 1, opacity: 0.8 }} />
              <Typography variant="h4" fontWeight={700}>
                {stats.assigned}
              </Typography>
              <Typography variant="body2">Assigned</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: filter === 'resolved' ? 'success.main' : 'white',
                color: filter === 'resolved' ? 'white' : 'inherit',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                },
              }}
              onClick={() => setFilter('resolved')}
            >
              <CheckIcon sx={{ fontSize: 40, mb: 1, opacity: 0.8 }} />
              <Typography variant="h4" fontWeight={700}>
                {stats.resolved}
              </Typography>
              <Typography variant="body2">Resolved</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Filter Info */}
        {filter !== 'all' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Showing <strong>{filter}</strong> requests.{' '}
            <Button size="small" onClick={() => setFilter('all')}>
              Show All
            </Button>
          </Alert>
        )}

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No requests found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {filter === 'all'
                ? "You haven't submitted any requests yet."
                : `You have no ${filter} requests.`}
            </Typography>
            <Button variant="contained" onClick={() => navigate('/submit-request')}>
              Submit Your First Request
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredRequests.map((request) => (
              <Grid item xs={12} key={request._id}>
                <Card
                  sx={{
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box flex={1}>
                        <Stack direction="row" spacing={1} mb={1} flexWrap="wrap">
                          <Chip label={request.type} color="primary" size="small" />
                          <Chip
                            label={request.urgency}
                            color={getUrgencyColor(request.urgency)}
                            size="small"
                          />
                          <Chip
                            label={request.status}
                            color={getStatusColor(request.status)}
                            size="small"
                          />
                        </Stack>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          {request.description.substring(0, 100)}
                          {request.description.length > 100 && '...'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          📍 {request.location?.address || 'No address provided'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Submitted: {new Date(request.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          color="primary"
                          onClick={() => handleViewDetails(request)}
                          title="View Details"
                        >
                          <ViewIcon />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* View Details Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 },
          }}
        >
          <DialogTitle>
            <Typography variant="h5" fontWeight={700}>
              Request Details
            </Typography>
          </DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Box>
                <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
                  <Chip label={selectedRequest.type} color="primary" />
                  <Chip
                    label={selectedRequest.urgency}
                    color={getUrgencyColor(selectedRequest.urgency)}
                  />
                  <Chip
                    label={selectedRequest.status}
                    color={getStatusColor(selectedRequest.status)}
                  />
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1" mb={2}>
                  {selectedRequest.description}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Location
                </Typography>
                <Typography variant="body1" mb={2}>
                  📍 {selectedRequest.location?.address || 'No address provided'}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Contact
                </Typography>
                <Typography variant="body1" mb={2}>
                  📞 {selectedRequest.contactNumber || 'Not provided'}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Submitted On
                </Typography>
                <Typography variant="body1" mb={2}>
                  {new Date(selectedRequest.createdAt).toLocaleString()}
                </Typography>

                {selectedRequest.claimedBy && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Claimed By
                    </Typography>
                    <Typography variant="body1" mb={2}>
                      {selectedRequest.claimedBy.name || 'Anonymous'}
                    </Typography>
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} variant="outlined">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </UserLayout>
  );
}

export default MyRequests;
