import MenuIcon from '@mui/icons-material/Menu';
import {
  alpha,
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { AmbientBackground } from './components/AmbientBackground';
import { gradientBrandText } from './glass';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { MatchPage } from './pages/MatchPage';
import { MatchesPage } from './pages/MatchesPage';
import { TacticEditorPage } from './pages/TacticEditorPage';
import { TacticsPage } from './pages/TacticsPage';
import { PlayerProfilePage } from './pages/PlayerProfilePage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { QuickMatchPage } from './pages/QuickMatchPage';
import { TeamsPage } from './pages/TeamsPage';

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Quick match', to: '/quick-match' },
  { label: 'Teams', to: '/teams' },
  { label: 'Matches', to: '/matches' },
  { label: 'Tactics', to: '/tactics' },
] as const;

const navButtonSx = (active: boolean) => ({
  minWidth: 0,
  px: 1.75,
  py: 0.75,
  borderRadius: 2,
  fontWeight: active ? 600 : 500,
  color: active ? '#fff' : alpha('#fff', 0.65),
  background: active
    ? `linear-gradient(135deg, ${alpha('#6366f1', 0.45)}, ${alpha('#0891b2', 0.25)})`
    : 'transparent',
  border: active ? `1px solid ${alpha('#fff', 0.18)}` : '1px solid transparent',
  boxShadow: active ? `0 4px 20px ${alpha('#6366f1', 0.25)}` : 'none',
  backdropFilter: active ? 'blur(12px)' : 'none',
  '&:hover': {
    color: '#fff',
    background: active
      ? `linear-gradient(135deg, ${alpha('#6366f1', 0.55)}, ${alpha('#0891b2', 0.35)})`
      : alpha('#fff', 0.06),
  },
});

function useNavActive(to: string) {
  const { pathname } = useLocation();
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

function NavButton({ to, label, onNavigate }: { to: string; label: string; onNavigate?: () => void }) {
  const active = useNavActive(to);
  return (
    <Button
      color="inherit"
      component={RouterLink}
      to={to}
      onClick={onNavigate}
      sx={navButtonSx(active)}
    >
      {label}
    </Button>
  );
}

function NavDrawerItem({ to, label, onNavigate }: { to: string; label: string; onNavigate: () => void }) {
  const active = useNavActive(to);
  return (
    <ListItemButton
      component={RouterLink}
      to={to}
      selected={active}
      onClick={onNavigate}
      sx={{ mx: 1, borderRadius: 2 }}
    >
      <ListItemText primary={label} />
    </ListItemButton>
  );
}

function Layout() {
  const theme = useTheme();
  const desktopNav = useMediaQuery(theme.breakpoints.up('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { session, signOut } = useAuth();
  if (!session) return <Navigate to="/login" replace />;

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <AmbientBackground>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: 0.75, py: 0.5 }}>
          {!desktopNav && (
            <IconButton color="inherit" edge="start" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ ...gradientBrandText, textDecoration: 'none', mr: { md: 2 }, fontWeight: 800, flexShrink: 0 }}
          >
            VolleyLab
          </Typography>
          {desktopNav &&
            NAV.map((item) => (
              <NavButton key={item.to} to={item.to} label={item.label} />
            ))}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" sx={{ mr: 1.5, opacity: 0.75, display: { xs: 'none', sm: 'block' } }}>
            {session.user.email}
          </Typography>
          <Button
            color="inherit"
            size="small"
            onClick={signOut}
            sx={{
              borderRadius: 2,
              border: `1px solid ${alpha('#fff', 0.12)}`,
              px: 1.5,
              flexShrink: 0,
              '&:hover': { background: alpha('#fff', 0.06) },
            }}
          >
            Log out
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={!desktopNav && drawerOpen}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: 260,
            background: 'rgba(8, 12, 22, 0.92)',
            backdropFilter: 'blur(20px)',
            borderRight: `1px solid ${alpha('#fff', 0.1)}`,
          },
        }}
      >
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="h6" sx={{ ...gradientBrandText, fontWeight: 800 }}>
            VolleyLab
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {session.user.email}
          </Typography>
        </Box>
        <List disablePadding>
          {NAV.map((item) => (
            <NavDrawerItem key={item.to} to={item.to} label={item.label} onNavigate={closeDrawer} />
          ))}
        </List>
      </Drawer>

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
        <Outlet />
      </Container>
    </AmbientBackground>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="teams/:id" element={<TeamDetailPage />} />
        <Route path="teams/:teamId/players/:playerId" element={<PlayerProfilePage />} />
        <Route path="quick-match" element={<QuickMatchPage />} />
        <Route path="matches" element={<MatchesPage />} />
        <Route path="matches/:id" element={<MatchPage />} />
        <Route path="tactics" element={<TacticsPage />} />
        <Route path="tactics/:id" element={<TacticEditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
