import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { gradientBrandText } from '../glass';
import { LineupEditor } from '../components/LineupEditor';
import { LiveRecorder } from '../components/LiveRecorder';
import { SetsPanel } from '../components/SetsPanel';
import { StatsTable } from '../components/StatsTable';
import { ErrorAlert, useAction, useFormations, useLoad } from '../hooks';
import { Match, MatchStatus } from '../types';

export function MatchPage() {
  const id = Number(useParams().id);
  const { session } = useAuth();
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
  const inProgress = match.status === 'IN_PROGRESS';
  const isOwner = match.ownerId === session?.user.id;

  return (
    <Stack spacing={3} sx={{ pb: inProgress ? { xs: 28, md: 0 } : 0 }}>
      <Stack spacing={1.5}>
        <Typography variant="h4" sx={{ ...gradientBrandText, fontSize: { xs: '1.35rem', sm: '2rem' } }}>
          {home?.team.name} vs {away?.team.name}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={match.status} color={inProgress ? 'success' : 'default'} />
          {isOwner && match.status === 'PLANNED' && (
            <Button variant="contained" onClick={() => setStatus('IN_PROGRESS')}>Start match</Button>
          )}
          {isOwner && inProgress && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => confirm('Finish the match? It cannot be reopened.') && setStatus('FINISHED')}
            >
              Finish match
            </Button>
          )}
        </Stack>
      </Stack>
      {!isOwner && (
        <Typography color="text.secondary">Read-only: only the match owner can change lineups, scores, or events.</Typography>
      )}
      <ErrorAlert error={loadError || error} />
      {match.status === 'PLANNED' && (
        <Typography color="text.secondary">Both teams need a complete lineup before the match can start.</Typography>
      )}

      <LineupEditor match={match} formations={formations} onChanged={refresh} readOnly={!isOwner} />
      <SetsPanel match={match} onChanged={refresh} readOnly={!isOwner} />
      {inProgress && isOwner && (
        <Box>
          <LiveRecorder match={match} version={version} onChanged={refresh} stickyOnMobile />
        </Box>
      )}
      <StatsTable matchId={id} version={version} />
    </Stack>
  );
}
