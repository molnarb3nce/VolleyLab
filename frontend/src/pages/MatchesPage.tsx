import {
  Button,
  Chip,
  Link as MuiLink,
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
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { gradientBrandText } from '../glass';
import { TableScroll } from '../components/TableScroll';
import { FORMATION_LABEL, FORMATIONS } from '../constants';
import { ErrorAlert, useAction, useLoad } from '../hooks';
import { Formation, Match, Team } from '../types';

export function MatchesPage() {
  const navigate = useNavigate();
  const { data: matches, error: loadError } = useLoad(() => api.get<Match[]>('/matches'), []);
  const { data: teams } = useLoad(() => api.get<Team[]>('/teams'), []);
  const { error, run } = useAction();
  const [home, setHome] = useState({ teamId: '', formation: 'FIVE_ONE' as Formation });
  const [away, setAway] = useState({ teamId: '', formation: 'FIVE_ONE' as Formation });

  const create = () =>
    run(async () => {
      const match = await api.post<Match>('/matches', {
        home: { teamId: Number(home.teamId), formation: home.formation },
        away: { teamId: Number(away.teamId), formation: away.formation },
      });
      navigate(`/matches/${match.id}`);
    });

  const picker = (label: string, value: typeof home, set: (v: typeof home) => void) => (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flex: 1, minWidth: { xs: '100%', sm: 280 } }}>
      <TextField
        size="small"
        select
        label={label}
        fullWidth
        value={value.teamId}
        onChange={(e) => set({ ...value, teamId: e.target.value })}
      >
        {teams?.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
      </TextField>
      <TextField
        size="small"
        select
        label="Formation"
        sx={{ width: { xs: '100%', sm: 120 } }}
        value={value.formation}
        onChange={(e) => set({ ...value, formation: e.target.value as Formation })}
      >
        {FORMATIONS.map((f) => <MenuItem key={f} value={f}>{FORMATION_LABEL[f]}</MenuItem>)}
      </TextField>
    </Stack>
  );

  return (
    <>
      <Typography variant="h4" gutterBottom sx={gradientBrandText}>Matches</Typography>
      <ErrorAlert error={loadError || error} />
      <Paper sx={{ p: 2, my: 2 }}>
        <Typography variant="h6" gutterBottom>New match</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} useFlexGap>
          {picker('Home team', home, setHome)}
          <Typography sx={{ alignSelf: { xs: 'center', md: 'auto' } }}>vs</Typography>
          {picker('Away team', away, setAway)}
          <Button
            variant="contained"
            disabled={!home.teamId || !away.teamId}
            onClick={create}
            sx={{ width: { xs: '100%', md: 'auto' }, flexShrink: 0 }}
          >
            Create
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          You can use any team, also teams of other users. The lineup is set on the next page.
        </Typography>
      </Paper>
      <TableScroll>
        <Table size="small" sx={{ minWidth: 520 }}>
          <TableHead>
            <TableRow><TableCell>Match</TableCell><TableCell>Date</TableCell><TableCell>Status</TableCell><TableCell>Sets</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {matches?.map((m) => {
              const [h, a] = [m.teams.find((t) => t.side === 'HOME'), m.teams.find((t) => t.side === 'AWAY')];
              return (
                <TableRow key={m.id}>
                  <TableCell><MuiLink component={Link} to={`/matches/${m.id}`}>{h?.team.name} vs {a?.team.name}</MuiLink></TableCell>
                  <TableCell>{new Date(m.playedAt).toLocaleString()}</TableCell>
                  <TableCell><Chip size="small" label={m.status} /></TableCell>
                  <TableCell>{m.sets.map((s) => `${s.homeScore}:${s.awayScore}`).join('  ')}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableScroll>
    </>
  );
}
