import React from 'react';
import { Box, Typography, Grid, Paper, Stack, Container } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import GroupsIcon from '@mui/icons-material/Groups';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    title: 'Request Help',
    description: 'Victims can post urgent needs with location and details for instant response.',
    icon: <HelpOutlineIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
    route: '/submit-request',
    accent: '#e9f2fb',
  },
  {
    title: 'Volunteer Match',
    description: 'Nearby volunteers are matched in real time to help requests based on skills and location.',
    icon: <VolunteerActivismIcon sx={{ fontSize: 48, color: 'secondary.main' }} />,
    route: '/volunteer-dashboard',
    accent: '#e8f3f1',
  },
  {
    title: 'NGO & Authority Tools',
    description: 'NGOs and authorities can coordinate, assign, and track aid distribution transparently.',
    icon: <GroupsIcon sx={{ fontSize: 48, color: 'info.main' }} />,
    route: '/ngo-dashboard',
    accent: '#eef5fb',
  },
  {
    title: 'Live Community Dashboard',
    description: 'See real-time stats, maps, and transparency reports for your community’s crisis response.',
    icon: <DashboardIcon sx={{ fontSize: 48, color: 'primary.dark' }} />,
    route: '/dashboard',
    accent: '#edf6fd',
  },
];

function Home() {
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Hero Section */}
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: 'primary.main', color: 'primary.contrastText', textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h2" fontWeight={800} sx={{ mb: 2, letterSpacing: 0.5 }}>
            Local Crisis HelpChain
          </Typography>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 400, opacity: 0.98 }}>
            Real-Time Decentralized Aid Coordination Platform
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: 680, mx: 'auto', opacity: 0.95 }}>
            Empowering communities to respond to crises instantly and transparently. Connect, coordinate, and make a difference—together.
          </Typography>
        </Container>
      </Box>
      {/* Feature Cards Section */}
      <Container maxWidth="lg" sx={{ mt: { xs: 4, md: 8 }, mb: 8 }}>
        <Grid container spacing={4} justifyContent="center" alignItems="stretch">
          {features.map((feature) => (
            <Grid item xs={12} sm={6} md={3} key={feature.title}>
              <Paper
                elevation={2}
                tabIndex={0}
                role="button"
                onClick={() => navigate(feature.route)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && navigate(feature.route)}
                sx={{
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                  cursor: 'pointer',
                  background: feature.accent,
                  boxShadow: 1,
                  transition: 'box-shadow 0.15s ease',
                  '&:hover, &:focus': { boxShadow: 4, outline: 'none' },
                }}
              >
                {feature.icon}
                <Typography variant="h6" fontWeight={700} align="center" mt={2} mb={1} color="text.primary">
                  {feature.title}
                </Typography>
                <Typography variant="body2" align="center" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
      {/* Footer */}
      <Box py={3} textAlign="center" color="text.secondary" fontSize={16}>
        &copy; {new Date().getFullYear()} Local Crisis HelpChain &mdash; Built with ❤️ for communities in need
      </Box>
    </Box>
  );
}

export default Home;