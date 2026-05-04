// Centralized MUI theme for crisis-friendly, calm, accessible UI
import { createTheme } from '@mui/material/styles';


const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1565c0', // calm emergency blue
      light: '#5e92f3',
      dark: '#003c8f',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00897b', // teal for trust/support
      light: '#4ebaaa',
      dark: '#005b4f',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32', // clear success/ok
    },
    warning: {
      main: '#fb8c00', // alerting but not alarming
    },
    error: {
      main: '#c62828', // errors and critical
    },
    info: {
      main: '#0288d1',
    },
    background: {
      default: '#f7f9fb', // soft neutral background
      paper: '#ffffff',
    },
    divider: 'rgba(0,0,0,0.1)'
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, \'Apple Color Emoji\', \'Segoe UI Emoji\'',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 1 },
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
