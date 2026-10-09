import { alpha, Box, Button, Chip, IconButton, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useState } from 'react';
import { api } from '../api';
import { ACTION_RESULTS, EVENT_ACTIONS } from '../constants';
import { ErrorAlert, useAction, useLoad } from '../hooks';
import { EventAction, EventResult, Match, MatchEvent } from '../types';

interface Props {
  match: Match;
  /** Changes whenever events or statistics must be refetched. */
  version: number;
  onChanged: () => void;
  /** Pin the recorder to the bottom of the viewport on small screens (live match use). */
  stickyOnMobile?: boolean;
}

/** Click a player, pick an action, pick its result: records one match event. */
export function LiveRecorder({ match, version, onChanged, stickyOnMobile }: Props) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const useSticky = Boolean(stickyOnMobile && mobile);

  const { data: events, error: loadError } = useLoad(
    () => api.get<MatchEvent[]>(`/matches/${match.id}/events`),
    [match.id, version],
  );
  const { error, run } = useAction();
  const [playerId, setPlayerId] = useState<number>();
  const [action, setAction] = useState<EventAction>();

  const currentSet = [...match.sets].reverse().find((s) => s.status === 'IN_PROGRESS');
  if (!currentSet) {
    return <Paper sx={{ p: 2 }}><Typography>Create a set (or reopen one) to start recording events.</Typography></Paper>;
  }

  const record = (result: EventResult) =>
    run(async () => {
      await api.post(`/matches/${match.id}/events`, { setId: currentSet.id, playerId, action, result });
      setAction(undefined);
      onChanged();
    });

  const label = (e: MatchEvent) => `Set ${match.sets.find((s) => s.id === e.setId)?.setNumber} - #${e.player.jerseyNumber} ${e.player.name}: ${e.action} / ${e.result}`;

  const panel = (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Live — set {currentSet.setNumber}</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {match.teams.map((mt) => (
          <div key={mt.id}>
            <Typography variant="subtitle2">{mt.team.name}</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
              {mt.lineup.map((l) => (
                <Chip
                  key={l.playerId}
                  label={`#${l.player.jerseyNumber} ${l.player.name}`}
                  color={playerId === l.playerId ? 'primary' : 'default'}
                  onClick={() => (setPlayerId(l.playerId), setAction(undefined))}
                />
              ))}
            </Stack>
          </div>
        ))}
      </Stack>

      {playerId && (
        <Stack spacing={1} sx={{ mt: 2 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={action ?? null}
            onChange={(_, v) => setAction(v ?? undefined)}
            sx={{ flexWrap: 'wrap', gap: 0.5, '& .MuiToggleButtonGroup-grouped': { border: 0, m: '2px !important' } }}
          >
            {EVENT_ACTIONS.map((a) => <ToggleButton key={a} value={a}>{a}</ToggleButton>)}
          </ToggleButtonGroup>
          {action && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {ACTION_RESULTS[action].map((r) => (
                <Button key={r} variant="contained" size="small" onClick={() => record(r)}>{r}</Button>
              ))}
            </Stack>
          )}
        </Stack>
      )}
      <ErrorAlert error={loadError || error} />

      <Typography variant="subtitle2" sx={{ mt: 2 }}>Latest events</Typography>
      {[...(events ?? [])].reverse().slice(0, 8).map((e) => (
        <Stack key={e.id} direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>{label(e)}</Typography>
          <IconButton
            size="small"
            title="Undo"
            onClick={() => run(async () => (await api.del(`/matches/${match.id}/events/${e.id}`), onChanged()))}
          >
            ✕
          </IconButton>
        </Stack>
      ))}
    </Paper>
  );

  if (!useSticky) return panel;

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (t) => t.zIndex.appBar - 1,
        px: 1,
        pt: 1,
        pb: 'max(8px, env(safe-area-inset-bottom))',
        background: (t) => alpha(t.palette.background.default, 0.92),
        backdropFilter: 'blur(16px)',
        borderTop: (t) => `1px solid ${alpha('#fff', 0.1)}`,
        maxHeight: '55vh',
        overflowY: 'auto',
      }}
    >
      {panel}
    </Box>
  );
}
