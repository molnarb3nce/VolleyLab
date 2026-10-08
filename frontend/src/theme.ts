import { alpha, createTheme } from '@mui/material';

const glassBg =
  'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.02) 100%)';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#818cf8', light: '#a5b4fc', dark: '#6366f1' },
    secondary: { main: '#22d3ee' },
    success: { main: '#34d399' },
    warning: { main: '#fbbf24' },
    error: { main: '#f87171' },
    background: {
      default: '#05070f',
      paper: alpha('#131b2e', 0.72),
    },
    text: {
      primary: '#f1f5f9',
      secondary: alpha('#e2e8f0', 0.65),
    },
    divider: alpha('#ffffff', 0.1),
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
    h4: { fontWeight: 600, letterSpacing: '-0.02em' },
    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: `${alpha('#fff', 0.2)} transparent`,
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'transparent' },
      styleOverrides: {
        root: {
          background: 'rgba(8, 12, 22, 0.55)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          borderBottom: `1px solid ${alpha('#fff', 0.1)}`,
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.25)',
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: glassBg,
          backdropFilter: 'blur(22px) saturate(170%)',
          WebkitBackdropFilter: 'blur(22px) saturate(170%)',
          border: `1px solid ${alpha('#fff', 0.12)}`,
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: glassBg,
          backdropFilter: 'blur(22px) saturate(170%)',
          WebkitBackdropFilter: 'blur(22px) saturate(170%)',
          border: `1px solid ${alpha('#fff', 0.12)}`,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            borderColor: alpha('#fff', 0.2),
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(129, 140, 248, 0.15)',
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundImage: glassBg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${alpha('#fff', 0.1)}`,
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: 0 },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 10 },
        containedPrimary: {
          background: 'linear-gradient(135deg, #6366f1 0%, #0891b2 55%, #10b981 100%)',
          backgroundSize: '200% 200%',
          transition: 'background-position 0.35s ease, box-shadow 0.2s ease',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.35)',
          '&:hover': {
            backgroundPosition: '100% 50%',
            boxShadow: '0 6px 28px rgba(34, 211, 238, 0.35)',
          },
        },
        outlined: {
          borderColor: alpha('#fff', 0.22),
          '&:hover': {
            borderColor: alpha('#fff', 0.35),
            background: alpha('#fff', 0.06),
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': { background: alpha('#fff', 0.08) },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: alpha('#000', 0.25),
            backdropFilter: 'blur(8px)',
            '& fieldset': { borderColor: alpha('#fff', 0.14) },
            '&:hover fieldset': { borderColor: alpha('#fff', 0.28) },
            '&.Mui-focused fieldset': { borderColor: alpha('#818cf8', 0.8) },
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          background: alpha('#000', 0.2),
          borderRadius: 10,
          padding: 2,
          border: `1px solid ${alpha('#fff', 0.1)}`,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          border: 0,
          borderRadius: '8px !important',
          color: alpha('#fff', 0.65),
          '&.Mui-selected': {
            background: `linear-gradient(135deg, ${alpha('#6366f1', 0.5)}, ${alpha('#0891b2', 0.45)})`,
            color: '#fff',
            '&:hover': { background: `linear-gradient(135deg, ${alpha('#6366f1', 0.6)}, ${alpha('#0891b2', 0.55)})` },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 6px',
          '&.Mui-selected': {
            background: `linear-gradient(90deg, ${alpha('#6366f1', 0.35)}, ${alpha('#22d3ee', 0.15)})`,
            border: `1px solid ${alpha('#818cf8', 0.35)}`,
            '&:hover': {
              background: `linear-gradient(90deg, ${alpha('#6366f1', 0.42)}, ${alpha('#22d3ee', 0.2)})`,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        outlined: {
          borderColor: alpha('#fff', 0.2),
          backdropFilter: 'blur(8px)',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td': { borderBottom: 0 },
        },
      },
    },
  },
});
