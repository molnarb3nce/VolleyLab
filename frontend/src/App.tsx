import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
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
        opacity: active ? 1 : 0.72,
        borderBottom: active ? '2px solid' : '2px solid transparent',
        borderRadius: 0,
        minWidth: 0,
        px: 1.5,
        py: 1.25,
        '&:hover': { opacity: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
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
    <>
      <AppBar position="sticky" color="primary">
        <Toolbar sx={{ gap: 0.5 }}>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ color: 'inherit', textDecoration: 'none', mr: 2, fontWeight: 700 }}
          >
            VolleyLab
          </Typography>
          {NAV.map((item) => (
            <NavButton key={item.to} to={item.to} label={item.label} />
          ))}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" sx={{ mr: 1.5, opacity: 0.9, display: { xs: 'none', sm: 'block' } }}>
            {session.user.email}
          </Typography>
          <Button color="inherit" size="small" onClick={signOut} sx={{ opacity: 0.9 }}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
        <Outlet />
      </Container>
    </>
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
