import { Box, Button, Container, CssBaseline, Paper, Stack, TextField, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme';
import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { ErrorAlert, useAction } from '../hooks';

export function LoginPage() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { error, run } = useAction();

  if (session) return <Navigate to="/" replace />;

  const submit = (mode: 'login' | 'register') => (e: FormEvent) => {
    e.preventDefault();
    run(() => signIn(mode, email, password));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', py: 4 }}>
    <Container maxWidth="xs">
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>VolleyLab</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tactics, matches, and team stats in one place.
        </Typography>
        <form onSubmit={submit('login')}>
          <Stack spacing={2}>
            <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField
              label="Password (min. 8 characters)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <ErrorAlert error={error} />
            <Button type="submit" variant="contained">Log in</Button>
            <Button onClick={submit('register')}>Register</Button>
          </Stack>
        </form>
      </Paper>
    </Container>
    </Box>
    </ThemeProvider>
  );
}
