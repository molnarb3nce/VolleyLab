import {
  Button,
  Chip,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { gradientBrandText } from '../glass';
import { useAuth } from '../auth';
import { TableScroll } from '../components/TableScroll';
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
      <Typography variant="h4" gutterBottom sx={{ ...gradientBrandText, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
        {team?.name ?? 'Team'}
      </Typography>
      <ErrorAlert error={loadError || error} />
      {team && !isOwner && <Typography color="text.secondary">Read-only: you are not the owner of this team.</Typography>}

      {isOwner && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ my: 2 }} useFlexGap alignItems={{ sm: 'center' }}>
          <TextField size="small" label="Team name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <Button sx={{ flexShrink: 0 }} onClick={() => run(async () => (await api.patch(`/teams/${id}`, { name }), reload()))}>
            Rename
          </Button>
          <Button
            color="error"
            sx={{ flexShrink: 0 }}
            onClick={() =>
              confirm('Delete this team?') &&
              run(async () => (await api.del(`/teams/${id}`), navigate('/teams')))
            }
          >
            Delete team
          </Button>
        </Stack>
      )}

      <TableScroll sx={{ my: 2 }}>
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Stats</TableCell>
              <TableCell align="right">Manage</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {team?.players?.map((p) => (
              <TableRow key={p.id} sx={{ opacity: p.isActive ? 1 : 0.5 }}>
                <TableCell>{p.jerseyNumber}</TableCell>
                <TableCell>
                  <Link to={`/teams/${id}/players/${p.id}`} style={{ color: 'inherit', fontWeight: 600, textDecoration: 'none' }}>
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>{p.role.replace(/_/g, ' ')}</TableCell>
                <TableCell>{!p.isActive && <Chip size="small" label="inactive" />}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    component={Link}
                    to={`/teams/${id}/players/${p.id}`}
                    endIcon={<ChevronRightIcon />}
                  >
                    Stats
                  </Button>
                </TableCell>
                <TableCell align="right">
                  {isOwner && (
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
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
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScroll>

      {isOwner && (
        <form onSubmit={addPlayer}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap alignItems={{ sm: 'flex-end' }}>
            <TextField size="small" label="Name" value={player.name} onChange={(e) => setPlayer({ ...player, name: e.target.value })} fullWidth />
            <TextField
              size="small"
              type="number"
              label="Jersey #"
              sx={{ width: { xs: '100%', sm: 110 } }}
              value={player.jerseyNumber}
              onChange={(e) => setPlayer({ ...player, jerseyNumber: e.target.value })}
            />
            <TextField
              size="small"
              select
              label="Role"
              sx={{ width: { xs: '100%', sm: 190 } }}
              value={player.role}
              onChange={(e) => setPlayer({ ...player, role: e.target.value as Role })}
            >
              {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <Button type="submit" variant="contained" sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}>
              Add player
            </Button>
          </Stack>
        </form>
      )}
    </>
  );
}
