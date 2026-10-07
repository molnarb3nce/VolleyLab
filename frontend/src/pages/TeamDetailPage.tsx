import {
  Button,
  Chip,
  MenuItem,
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
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ROLES } from '../constants';
import { ErrorAlert, useAction, useLoad } from '../hooks';
import { Role, Team } from '../types';

export function TeamDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { data: team, error: loadError, reload } = useLoad(
    () => api.get<Team>(`/teams/${id}?includeInactive=true`),
    [id],
  );
  const { error, run } = useAction();
  const [name, setName] = useState('');
  const [player, setPlayer] = useState({ name: '', jerseyNumber: '', role: 'SETTER' as Role });

  useEffect(() => setName(team?.name ?? ''), [team?.name]);
  const isOwner = team?.ownerId === session?.user.id;

  const addPlayer = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api.post(`/teams/${id}/players`, { ...player, jerseyNumber: Number(player.jerseyNumber) });
      setPlayer({ ...player, name: '', jerseyNumber: '' });
      await reload();
    });
  };

  const renamePlayer = (playerId: number, current: string) => {
    const next = prompt('New name', current);
    if (next) run(async () => (await api.patch(`/players/${playerId}`, { name: next }), reload()));
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>{team?.name ?? 'Team'}</Typography>
      <ErrorAlert error={loadError || error} />
      {team && !isOwner && <Typography color="text.secondary">Read-only: you are not the owner of this team.</Typography>}

      {isOwner && (
        <Stack direction="row" spacing={2} sx={{ my: 2 }}>
          <TextField size="small" label="Team name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => run(async () => (await api.patch(`/teams/${id}`, { name }), reload()))}>Rename</Button>
          <Button
            color="error"
            onClick={() =>
              confirm('Delete this team?') &&
              run(async () => (await api.del(`/teams/${id}`), navigate('/teams')))
            }
          >
            Delete team
          </Button>
        </Stack>
      )}

      <Paper sx={{ my: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>#</TableCell><TableCell>Name</TableCell><TableCell>Role</TableCell><TableCell /><TableCell /></TableRow>
          </TableHead>
          <TableBody>
            {team?.players?.map((p) => (
              <TableRow key={p.id} sx={{ opacity: p.isActive ? 1 : 0.5 }}>
                <TableCell>{p.jerseyNumber}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.role}</TableCell>
                <TableCell>{!p.isActive && <Chip size="small" label="inactive" />}</TableCell>
                <TableCell align="right">
                  {isOwner && (
                    <>
                      <Button size="small" onClick={() => renamePlayer(p.id, p.name)}>Rename</Button>
                      {p.isActive ? (
                        <Button
                          size="small"
                          color="error"
                          onClick={() => run(async () => {
                            const r = await api.del<{ result: string }>(`/players/${p.id}`);
                            if (r.result === 'deactivated') alert('The player has match data and was deactivated instead of deleted.');
                            await reload();
                          })}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          onClick={() => run(async () => (await api.patch(`/players/${p.id}`, { isActive: true }), reload()))}
                        >
                          Reactivate
                        </Button>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {isOwner && (
        <form onSubmit={addPlayer}>
          <Stack direction="row" spacing={2}>
            <TextField size="small" label="Name" value={player.name} onChange={(e) => setPlayer({ ...player, name: e.target.value })} />
            <TextField
              size="small"
              type="number"
              label="Jersey #"
              sx={{ width: 110 }}
              value={player.jerseyNumber}
              onChange={(e) => setPlayer({ ...player, jerseyNumber: e.target.value })}
            />
            <TextField size="small" select label="Role" sx={{ width: 190 }} value={player.role} onChange={(e) => setPlayer({ ...player, role: e.target.value as Role })}>
              {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <Button type="submit" variant="contained">Add player</Button>
          </Stack>
        </form>
      )}
    </>
  );
}
