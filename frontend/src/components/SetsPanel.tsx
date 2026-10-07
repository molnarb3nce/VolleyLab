import { Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { api } from '../api';
import { ErrorAlert, useAction } from '../hooks';
import { Match, MatchSet } from '../types';

/** Set scores are entered by hand (+1 / -1) and do not depend on the recorded events. */
export function SetsPanel({ match, onChanged }: { match: Match; onChanged: () => void }) {
  const { error, run } = useAction();
  const locked = match.status === 'FINISHED';
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
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Sets</Typography>
        <Button
          variant="outlined"
          disabled={locked}
          onClick={() => run(async () => (await api.post(`/matches/${match.id}/sets`), onChanged()))}
        >
          New set
        </Button>
      </Stack>
      <ErrorAlert error={error} />
      {match.sets.map((set) => (
        <Stack key={set.id} direction="row" alignItems="center" spacing={2} sx={{ my: 1 }}>
          <Typography sx={{ width: 60 }}>Set {set.setNumber}</Typography>
          <Typography variant="caption" sx={{ width: 90 }}>{home?.team.name}</Typography>
          {score(set, 'homeScore')}
          <Typography>:</Typography>
          {score(set, 'awayScore')}
          <Typography variant="caption" sx={{ width: 90 }}>{away?.team.name}</Typography>
          <Chip size="small" label={set.status} color={set.status === 'FINISHED' ? 'default' : 'primary'} />
          <Button
            size="small"
            disabled={locked}
            onClick={() => patch(set, { status: set.status === 'FINISHED' ? 'IN_PROGRESS' : 'FINISHED' })}
          >
            {set.status === 'FINISHED' ? 'Reopen' : 'Finish set'}
          </Button>
        </Stack>
      ))}
      {match.sets.length === 0 && <Typography color="text.secondary">No sets yet.</Typography>}
    </Paper>
  );
}
