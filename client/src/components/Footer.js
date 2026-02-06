import React from 'react';
import { Box, Typography } from '@mui/material';

function Footer({ text }) {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper',
        color: 'text.secondary',
        py: 1.5,
        px: 2,
        textAlign: 'center',
        mt: 'auto', // IMPORTANT: pushes footer to bottom
      }}
    >
      <Typography variant="body2">
        {text}
      </Typography>
    </Box>
  );
}

export default Footer;
