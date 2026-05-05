import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AdminLayout from '../components/admin/AdminLayout';
import AssignVolunteerDialog from '../components/AssignVolunteerDialog';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';

const AdminDashboard = () => {
  const [allNgos, setAllNgos] = useState([]);
  const [allVolunteers, setAllVolunteers] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [volSearch, setVolSearch] = useState('');
  const [volStatusFilter, setVolStatusFilter] = useState('all');
  const [sosRequests, setSosRequests] = useState([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningRequest, setAssigningRequest] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const pageCard = {
    p: 3,
    borderRadius: 3,
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
  };

  const statCard = {
    ...pageCard,
    minHeight: 132,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  };

  const fetchAllUsers = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/all-users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAllNgos(res.data.ngos || []);
      setAllVolunteers(res.data.volunteers || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPending = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/pending`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNgos(res.data.ngos || []);
      setVolunteers(res.data.volunteers || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        navigate('/login', { replace: true });
      }
    }
  };

  const fetchSosRequests = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/requests?type=rescue&status=open&sort=-createdAt`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSosRequests(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const approveNGO = async (id) => {
    await axios.put(
      `${process.env.REACT_APP_API_URL}/api/admin/approve-ngo/${id}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchAllUsers();
    fetchPending();
  };

  const rejectNGO = async (id) => {
    await axios.delete(
      `${process.env.REACT_APP_API_URL}/api/admin/reject-ngo/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchAllUsers();
    fetchPending();
  };

  const approveVolunteer = async (id) => {
    await axios.put(
      `${process.env.REACT_APP_API_URL}/api/admin/approve-volunteer/${id}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchAllUsers();
    fetchPending();
  };

  const rejectVolunteer = async (id) => {
    await axios.delete(
      `${process.env.REACT_APP_API_URL}/api/admin/reject-volunteer/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchAllUsers();
    fetchPending();
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const handleOpenAssignDialog = (request) => {
    setAssigningRequest(request);
    setAssignDialogOpen(true);
  };

  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setAssigningRequest(null);
  };

  const handleAssignedSuccess = (updatedRequest) => {
    const updatedId = updatedRequest?._id || updatedRequest?.id;
    if (!updatedId) {
      handleCloseAssignDialog();
      return;
    }

    setSosRequests((prev) => prev.map((req) => ((req._id || req.id) === updatedId ? updatedRequest : req)));
    handleCloseAssignDialog();
  };

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    fetchAllUsers();
    fetchPending();
    fetchSosRequests();
  }, [token]);

  const filteredNgos = allNgos.filter((ngo) => {
    const name = ngo.name?.toLowerCase() || '';
    const email = ngo.email?.toLowerCase() || '';

    const matchesSearch =
      name.includes(search.toLowerCase()) ||
      email.includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'approved' && ngo.verified) ||
      (statusFilter === 'pending' && !ngo.verified);

    return matchesSearch && matchesStatus;
  });

  const filteredVolunteers = allVolunteers.filter((vol) => {
    const name = vol.name?.toLowerCase() || '';
    const email = vol.email?.toLowerCase() || '';

    const matchesSearch =
      name.includes(volSearch.toLowerCase()) ||
      email.includes(volSearch.toLowerCase());

    const matchesStatus =
      volStatusFilter === 'all' ||
      (volStatusFilter === 'approved' && vol.verified) ||
      (volStatusFilter === 'pending' && !vol.verified);

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout handleLogout={handleLogout}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Paper sx={{ ...pageCard, background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)' }}>
          <Stack spacing={1}>
            <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 600, letterSpacing: 1.4 }}>
              Admin Control Panel
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              Admin Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760 }}>
              Review SOS activity, approve organizations, and manage volunteers from one structured workspace.
            </Typography>
          </Stack>
        </Paper>

        <Box>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              SOS Assignment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Assign verified volunteers to open SOS requests. The NGO dashboard updates automatically after assignment.
            </Typography>
          </Stack>

          {sosRequests.length === 0 ? (
            <Paper sx={{ ...pageCard, py: 4 }}>
              <Typography color="text.secondary">No open SOS requests right now.</Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {sosRequests.map((req) => (
                <Grid item xs={12} md={6} lg={4} key={req._id}>
                  <Paper sx={pageCard}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {req.title || 'SOS Alert'}
                      </Typography>
                      <Chip size="small" label={req.status} color="warning" sx={{ fontWeight: 700 }} />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
                      {req.description || 'No description provided'}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                      Location: {req.location?.address || 'Live SOS location'}
                    </Typography>

                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleOpenAssignDialog(req)}
                      sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
                    >
                      Assign Volunteer
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={statCard}>
              <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
                Pending NGOs
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                {ngos.length}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={statCard}>
              <VolunteerActivismOutlinedIcon sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
                Pending Volunteers
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                {volunteers.length}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Paper sx={pageCard}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Pending NGOs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review and approve organization registrations.
              </Typography>
            </Box>

            {ngos.length === 0 ? (
              <Typography color="text.secondary">No pending NGOs</Typography>
            ) : (
              ngos.map((ngo) => (
                <Paper key={ngo._id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography sx={{ fontWeight: 700 }}>{ngo.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{ngo.email}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button variant="contained" color="success" size="small" onClick={() => approveNGO(ngo._id)} sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}>
                      Approve
                    </Button>
                    <Button variant="outlined" color="error" size="small" onClick={() => rejectNGO(ngo._id)} sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}>
                      Reject
                    </Button>
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        </Paper>

        <Paper sx={pageCard}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Pending Volunteers
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verify volunteer applications before they receive SOS assignments.
              </Typography>
            </Box>

            {volunteers.length === 0 ? (
              <Typography color="text.secondary">No pending volunteers</Typography>
            ) : (
              volunteers.map((vol) => (
                <Paper key={vol._id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography sx={{ fontWeight: 700 }}>{vol.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{vol.email}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button variant="contained" color="success" size="small" onClick={() => approveVolunteer(vol._id)} sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}>
                      Approve
                    </Button>
                    <Button variant="outlined" color="error" size="small" onClick={() => rejectVolunteer(vol._id)} sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}>
                      Reject
                    </Button>
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        </Paper>

        <Paper sx={pageCard}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                All NGOs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Search and review organization status.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search NGOs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                select
                size="small"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: { xs: '100%', md: 180 } }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </TextField>
            </Stack>

            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <Stack spacing={1.5}>
                {filteredNgos.length === 0 ? (
                  <Typography align="center" color="text.secondary" sx={{ py: 2 }}>
                    No NGOs found
                  </Typography>
                ) : (
                  filteredNgos.map((ngo) => (
                    <Paper key={ngo._id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Stack spacing={1}>
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{ngo.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {ngo.email}
                          </Typography>
                        </Box>
                        <Box>
                          <Chip
                            label={ngo.verified ? 'Approved' : 'Pending'}
                            color={ngo.verified ? 'success' : 'warning'}
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </Box>
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', display: { xs: 'none', md: 'block' } }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredNgos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No NGOs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNgos.map((ngo) => (
                      <TableRow key={ngo._id} hover>
                        <TableCell>{ngo.name}</TableCell>
                        <TableCell>{ngo.email}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={ngo.verified ? 'Approved' : 'Pending'}
                            color={ngo.verified ? 'success' : 'warning'}
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </Paper>

        <Paper sx={pageCard}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                All Volunteers
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Search and review volunteer verification status.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search Volunteers..."
                value={volSearch}
                onChange={(e) => setVolSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                select
                size="small"
                value={volStatusFilter}
                onChange={(e) => setVolStatusFilter(e.target.value)}
                sx={{ minWidth: { xs: '100%', md: 180 } }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </TextField>
            </Stack>

            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <Stack spacing={1.5}>
                {filteredVolunteers.length === 0 ? (
                  <Typography align="center" color="text.secondary" sx={{ py: 2 }}>
                    No volunteers found
                  </Typography>
                ) : (
                  filteredVolunteers.map((vol) => (
                    <Paper key={vol._id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Stack spacing={1}>
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{vol.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {vol.email}
                          </Typography>
                        </Box>
                        <Box>
                          <Chip
                            label={vol.verified ? 'Approved' : 'Pending'}
                            color={vol.verified ? 'success' : 'warning'}
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </Box>
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', display: { xs: 'none', md: 'block' } }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredVolunteers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No volunteers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVolunteers.map((vol) => (
                      <TableRow key={vol._id} hover>
                        <TableCell>{vol.name}</TableCell>
                        <TableCell>{vol.email}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={vol.verified ? 'Approved' : 'Pending'}
                            color={vol.verified ? 'success' : 'warning'}
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </Paper>
      </Box>

      <AssignVolunteerDialog
        open={assignDialogOpen}
        requestId={assigningRequest?._id}
        requestLocation={assigningRequest?.location}
        onClose={handleCloseAssignDialog}
        onAssigned={handleAssignedSuccess}
      />
    </AdminLayout>
  );
};

export default AdminDashboard;
