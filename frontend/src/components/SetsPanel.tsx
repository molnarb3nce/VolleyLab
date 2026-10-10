import { Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { api } from '../api';
import { ErrorAlert, useAction } from '../hooks';
import { Match, MatchSet } from '../types';

/** Set scores are entered by hand (+1 / -1) and do not depend on the recorded events. */
export function SetsPanel({ match, onChanged, readOnly }: { match: Match; onChanged: () => void; readOnly?: boolean }) {
  const { error, run } = useAction();
  const locked = match.status === 'FINISHED' || readOnly;
  const [home, away] = [match.teams.find((t) => t.side === 'HOME'), match.teams.find((t) => t.side === 'AWAY')];

  const patch = (set: MatchSet, body: object) =>
    run(async () => {
      await api.patch(`/matches/${match.id}/sets/${set.id}`, body);
      onChanged();
    });

  const score = (set: MatchSet, field: 'homeScore' | 'awayScore') => (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Button size="small" disabled={locked || set[field] === 0} onClick={() => patch(set, { [field]: set[field] - 1 })}>-</Button>
      <Typography variant="h5" sx={{ minWidth: 36, textAlign: 'center' }}>{set[field]}</Typography>
      <Button size="small" disabled={locked} onClick={() => patch(set, { [field]: set[field] + 1 })}>+</Button>
    </Stack>
  );

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1}>
        <Typography variant="h6">Sets</Typography>
        <Button
          variant="outlined"
          disabled={locked}
          onClick={() => run(async () => (await api.post(`/matches/${match.id}/sets`), onChanged()))}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          New set
        </Button>
      </Stack>
      <ErrorAlert error={error} />
      {match.sets.map((set) => (
        <Stack
          key={set.id}
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={{ xs: 1, sm: 2 }}
          sx={{ my: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}
        >
          <Typography fontWeight={600} sx={{ minWidth: { sm: 60 } }}>Set {set.setNumber}</Typography>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography variant="caption" sx={{ maxWidth: 120 }} noWrap title={home?.team.name}>
              {home?.team.name}
            </Typography>
            {score(set, 'homeScore')}
            <Typography>:</Typography>
            {score(set, 'awayScore')}
            <Typography variant="caption" sx={{ maxWidth: 120 }} noWrap title={away?.team.name}>
              {away?.team.name}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ ml: { sm: 'auto' } }}>
            <Chip size="small" label={set.status} color={set.status === 'FINISHED' ? 'default' : 'primary'} />
            <Button
              size="small"
              disabled={locked}
              onClick={() => patch(set, { status: set.status === 'FINISHED' ? 'IN_PROGRESS' : 'FINISHED' })}
            >
              {set.status === 'FINISHED' ? 'Reopen' : 'Finish set'}
            </Button>
          </Stack>
        </Stack>
      ))}
      {match.sets.length === 0 && <Typography color="text.secondary">No sets yet.</Typography>}
    </Paper>
  );
}
