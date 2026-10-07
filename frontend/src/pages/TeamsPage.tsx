import {
  Button,
  Checkbox,
  FormControlLabel,
  Link as MuiLink,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, useAction, useLoad } from '../hooks';
import { Team } from '../types';

export function TeamsPage() {
  const { session } = useAuth();
  const [mine, setMine] = useState(false);
  const [name, setName] = useState('');
  const { data: teams, error: loadError, reload } = useLoad(
    () => api.get<Team[]>(`/teams${mine ? '?mine=true' : ''}`),
    [mine],
  );
  const { error, run } = useAction();

  const create = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api.post('/teams', { name });
      setName('');
      await reload();
    });
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>Teams</Typography>
      <Typography color="text.secondary" gutterBottom>
        Every team can be used in matches and tactics, but only its owner can edit it.
      </Typography>
      <ErrorAlert error={loadError || error} />
      <form onSubmit={create}>
        <Stack direction="row" spacing={2} sx={{ my: 2 }}>
          <TextField size="small" label="New team name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="contained">Create team</Button>
          <FormControlLabel
            control={<Checkbox checked={mine} onChange={(e) => setMine(e.target.checked)} />}
            label="Only my teams"
          />
        </Stack>
      </form>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>Name</TableCell><TableCell>Active players</TableCell><TableCell>Owner</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {teams?.map((t) => (
              <TableRow key={t.id}>
                <TableCell><MuiLink component={Link} to={`/teams/${t.id}`}>{t.name}</MuiLink></TableCell>
                <TableCell>{t._count?.players ?? 0}</TableCell>
                <TableCell>{t.ownerId === session?.user.id ? 'you' : `user ${t.ownerId}`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
