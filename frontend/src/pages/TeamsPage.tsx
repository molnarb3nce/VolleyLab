import {
  Button,
  Checkbox,
  FormControlLabel,
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
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { gradientBrandText } from '../glass';
import { useAuth } from '../auth';
import { TableScroll } from '../components/TableScroll';
import { ErrorAlert, useAction, useLoad } from '../hooks';
import { navTableRowSx } from '../table';
import { Team } from '../types';

export function TeamsPage() {
  const navigate = useNavigate();
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
      <Typography variant="h4" gutterBottom sx={gradientBrandText}>Teams</Typography>
      <Typography color="text.secondary" gutterBottom>
        Every team can be used in matches and tactics, but only its owner can edit it.
      </Typography>
      <ErrorAlert error={loadError || error} />
      <form onSubmit={create}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ my: 2 }}
          useFlexGap
        >
          <TextField size="small" label="New team name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <Button type="submit" variant="contained" sx={{ flexShrink: 0 }}>Create team</Button>
          <FormControlLabel
            control={<Checkbox checked={mine} onChange={(e) => setMine(e.target.checked)} />}
            label="Only my teams"
          />
        </Stack>
      </form>
      <TableScroll>
        <Table size="small" sx={{ minWidth: 480 }}>
          <TableHead>
            <TableRow><TableCell>Name</TableCell><TableCell>Active players</TableCell><TableCell>Owner</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {teams?.map((t) => (
              <TableRow
                key={t.id}
                hover
                sx={navTableRowSx}
                onClick={() => navigate(`/teams/${t.id}`)}
              >
                <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
                <TableCell>{t._count?.players ?? 0}</TableCell>
                <TableCell>{t.ownerId === session?.user.id ? 'you' : `user ${t.ownerId}`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScroll>
    </>
  );
}
