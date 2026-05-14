import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Container, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../api/axios';
import RequestActivityFeed from '../components/RequestActivityFeed';
import { useAuth } from '../context/AuthContext';

export default function VolunteerActivity() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        setLoading(true);
        // Server returns volunteer-specific requests when auth role is volunteer
        const res = await api.get('/api/requests', { headers: { Authorization: `Bearer ${token}` } });
        if (!mounted) return;
        // For volunteer, endpoint returns either data.results or myRequests etc. Normalize
        const data = res.data?.data || res.data?.myRequests || res.data || [];
        setRequests(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch requests for activity page', err);
        setRequests([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetch();
    return () => { mounted = false; };
  }, [token]);

  return (
    <Container sx={{ py: 3 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/dashboard/volunteer')}
        sx={{ mb: 2, textTransform: 'none', fontWeight: 600 }}
      >
        Back to Dashboard
      </Button>

      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Live request activity
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Recent state changes across the requests currently visible to you.
      </Typography>

      <RequestActivityFeed requests={requests} title="My activity" subtitle="Latest changes for requests relevant to you" />
    </Container>
  );
}
