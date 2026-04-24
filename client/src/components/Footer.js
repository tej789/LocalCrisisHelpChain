import React from 'react';
import { Box, Typography, Link, Stack } from '@mui/material';

const trustedResourceLinks = [
  { label: 'IFRC Emergency Response', href: 'https://www.ifrc.org/' },
  { label: 'UN OCHA Humanitarian Data', href: 'https://www.unocha.org/' },
  { label: 'WHO Emergency Preparedness', href: 'https://www.who.int/emergencies' },
  { label: 'NDMA India Guidelines', href: 'https://ndma.gov.in/' },
];

const volunteerQuickLinks = [
  { label: 'Open Requests', href: '/dashboard/volunteer' },
  { label: 'Assigned Requests', href: '/dashboard/volunteer?view=assigned' },
  { label: 'Nearby Services', href: '/nearby-services' },
];

const safetyChecklist = [
  'Confirm request details before dispatch.',
  'Share live location while on active route.',
  'Update completion status immediately after support.',
];

const emergencyContacts = [
  { label: 'National Emergency', value: '112' },
  { label: 'Ambulance', value: '108' },
  { label: 'Disaster Helpline', value: '1078' },
];

function Footer({
  text,
  showProfessionalLinks = false,
  variant = 'default',
  volunteerStatus = 'offline',
  activeAssignments = 0,
  resolvedAssignments = 0,
}) {
  const year = new Date().getFullYear();
  const isVolunteerVariant = variant === 'volunteer';

  return (
    <Box
      component="footer"
      sx={{
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: isVolunteerVariant ? '#f3f7fb' : showProfessionalLinks ? '#f8fafc' : 'background.paper',
        backgroundImage: isVolunteerVariant
          ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.04) 0%, rgba(15, 23, 42, 0) 100%)'
          : 'none',
        color: 'text.secondary',
        py: isVolunteerVariant || showProfessionalLinks ? 3 : 1.5,
        px: { xs: 2, md: 4 },
        mt: 'auto',
      }}
    >
      {isVolunteerVariant && (
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={{ xs: 2.5, md: 4 }}
          justifyContent="space-between"
          sx={{ maxWidth: 1200, mx: 'auto', mb: 2.5 }}
        >
          <Box sx={{ maxWidth: 430 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.75, letterSpacing: 0.2 }}>
              Volunteer Operations Hub
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
              Field-ready coordination for urgent support delivery, route visibility, and accountable response tracking.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1.25, fontSize: '0.9rem', color: 'text.primary' }}>
              <strong>Shift Status:</strong> {volunteerStatus === 'available' ? 'Available' : 'Offline'} | <strong>Active:</strong> {activeAssignments} | <strong>Resolved:</strong> {resolvedAssignments}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
              Quick Access
            </Typography>
            <Stack spacing={0.5}>
              {volunteerQuickLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  underline="hover"
                  color="primary"
                  sx={{ fontSize: '0.9rem', width: 'fit-content' }}
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          </Box>

          <Box sx={{ minWidth: { xs: 'auto', sm: 260 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
              Safety Checklist
            </Typography>
            <Stack spacing={0.6}>
              {safetyChecklist.map((item) => (
                <Typography key={item} variant="body2" sx={{ fontSize: '0.88rem' }}>
                  • {item}
                </Typography>
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
              Emergency Contacts
            </Typography>
            <Stack spacing={0.5}>
              {emergencyContacts.map((contact) => (
                <Typography key={contact.label} variant="body2" sx={{ fontSize: '0.9rem' }}>
                  <strong>{contact.label}:</strong> {contact.value}
                </Typography>
              ))}
            </Stack>
          </Box>
        </Stack>
      )}

      {showProfessionalLinks && (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2.5, md: 5 }}
          justifyContent="space-between"
          sx={{ maxWidth: 1200, mx: 'auto', mb: 2.5 }}
        >
          <Box sx={{ maxWidth: 420 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.75 }}>
              Local Crisis HelpChain
            </Typography>
            <Typography variant="body2">
              Coordinating volunteers, communities, and NGOs with timely request tracking and transparent response updates.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
              Trusted Resources
            </Typography>
            <Stack spacing={0.5}>
              {trustedResourceLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  color="primary"
                  sx={{ fontSize: '0.9rem', width: 'fit-content' }}
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          </Box>
        </Stack>
      )}

      <Box sx={{ borderTop: (theme) => `1px solid ${theme.palette.divider}`, pt: 1.5, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: isVolunteerVariant ? 500 : 400 }}>
          {text || `© ${year} Local Crisis HelpChain. All rights reserved.`}
        </Typography>
      </Box>
    </Box>
  );
}

export default Footer;
