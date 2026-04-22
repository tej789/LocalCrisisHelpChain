import React from 'react';
import { Box, Typography, Link, Stack } from '@mui/material';

const trustedResourceLinks = [
  { label: 'IFRC Emergency Response', href: 'https://www.ifrc.org/' },
  { label: 'UN OCHA Humanitarian Data', href: 'https://www.unocha.org/' },
  { label: 'WHO Emergency Preparedness', href: 'https://www.who.int/emergencies' },
  { label: 'NDMA India Guidelines', href: 'https://ndma.gov.in/' },
];

function Footer({ text, showProfessionalLinks = false }) {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: showProfessionalLinks ? '#f8fafc' : 'background.paper',
        color: 'text.secondary',
        py: showProfessionalLinks ? 3 : 1.5,
        px: { xs: 2, md: 4 },
        mt: 'auto', // IMPORTANT: pushes footer to bottom
      }}
    >
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
        <Typography variant="body2">
          {text || `© ${year} Local Crisis HelpChain. All rights reserved.`}
        </Typography>
      </Box>
    </Box>
  );
}

export default Footer;
