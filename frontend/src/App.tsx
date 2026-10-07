import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { MatchPage } from './pages/MatchPage';
import { MatchesPage } from './pages/MatchesPage';
import { TacticEditorPage } from './pages/TacticEditorPage';
import { TacticsPage } from './pages/TacticsPage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { TeamsPage } from './pages/TeamsPage';

function Layout() {
  const { session, signOut } = useAuth();
  if (!session) return <Navigate to="/login" replace />;

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ color: 'inherit', textDecoration: 'none', mr: 3 }}>
            VolleyLab
          </Typography>
          <Button color="inherit" component={RouterLink} to="/teams">Teams</Button>
          <Button color="inherit" component={RouterLink} to="/matches">Matches</Button>
          <Button color="inherit" component={RouterLink} to="/tactics">Tactics</Button>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" sx={{ mr: 2 }}>{session.user.email}</Typography>
          <Button color="inherit" onClick={signOut}>Log out</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }}>
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
