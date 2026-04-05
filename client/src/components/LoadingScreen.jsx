import React from 'react';
import { Box, Stack, CircularProgress, Typography } from '@mui/material';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <Stack direction="column" spacing={2} alignItems="center">
        <CircularProgress />
        {message && (
          <Typography variant="body1" color="textSecondary">
            {message}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default LoadingScreen;
