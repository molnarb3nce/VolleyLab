import { alpha, AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
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
import { TeamDetailPage } from './pages/TeamDetailPage';
import { TeamsPage } from './pages/TeamsPage';

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Teams', to: '/teams' },
  { label: 'Matches', to: '/matches' },
  { label: 'Tactics', to: '/tactics' },
] as const;

function NavButton({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const active = to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Button
      color="inherit"
      component={RouterLink}
      to={to}
      sx={{
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
      }}
    >
      {label}
    </Button>
  );
}

function Layout() {
  const { session, signOut } = useAuth();
  if (!session) return <Navigate to="/login" replace />;

  return (
    <AmbientBackground>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: 0.75, flexWrap: 'wrap', py: 0.5 }}>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ ...gradientBrandText, textDecoration: 'none', mr: 2, fontWeight: 800 }}
          >
            VolleyLab
          </Typography>
          {NAV.map((item) => (
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
              '&:hover': { background: alpha('#fff', 0.06) },
            }}
          >
            Log out
          </Button>
        </Toolbar>
      </AppBar>
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
        <Route path="matches" element={<MatchesPage />} />
        <Route path="matches/:id" element={<MatchPage />} />
        <Route path="tactics" element={<TacticsPage />} />
        <Route path="tactics/:id" element={<TacticEditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
