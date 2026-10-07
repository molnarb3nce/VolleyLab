import { Button, Chip, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { LineupEditor } from '../components/LineupEditor';
import { LiveRecorder } from '../components/LiveRecorder';
import { SetsPanel } from '../components/SetsPanel';
import { StatsTable } from '../components/StatsTable';
import { ErrorAlert, useAction, useFormations, useLoad } from '../hooks';
import { Match, MatchStatus } from '../types';

export function MatchPage() {
  const id = Number(useParams().id);
  const formations = useFormations();
  const { data: match, error: loadError, reload } = useLoad(() => api.get<Match>(`/matches/${id}`), [id]);
  const { error, run } = useAction();
  const [version, setVersion] = useState(0); // bumped when events/statistics must be refetched

  const refresh = () => {
    reload();
    setVersion((v) => v + 1);
  };
  const setStatus = (status: MatchStatus) =>
    run(async () => {
      await api.patch(`/matches/${id}`, { status });
      refresh();
    });

  if (!match || !formations) return <ErrorAlert error={loadError} />;
  const [home, away] = [match.teams.find((t) => t.side === 'HOME'), match.teams.find((t) => t.side === 'AWAY')];

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="h4">{home?.team.name} vs {away?.team.name}</Typography>
        <Chip label={match.status} color={match.status === 'IN_PROGRESS' ? 'success' : 'default'} />
        {match.status === 'PLANNED' && <Button variant="contained" onClick={() => setStatus('IN_PROGRESS')}>Start match</Button>}
        {match.status === 'IN_PROGRESS' && (
          <Button variant="outlined" color="error" onClick={() => confirm('Finish the match? It cannot be reopened.') && setStatus('FINISHED')}>
            Finish match
          </Button>
        )}
      </Stack>
      <ErrorAlert error={loadError || error} />
      {match.status === 'PLANNED' && (
        <Typography color="text.secondary">Both teams need a complete lineup before the match can start.</Typography>
      )}

      <LineupEditor match={match} formations={formations} onChanged={refresh} />
      <SetsPanel match={match} onChanged={refresh} />
      {match.status === 'IN_PROGRESS' && <LiveRecorder match={match} version={version} onChanged={refresh} />}
      <StatsTable matchId={id} version={version} />
    </Stack>
  );
}
