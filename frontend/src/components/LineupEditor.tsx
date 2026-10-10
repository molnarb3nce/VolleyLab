import { Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { FORMATION_LABEL, FORMATIONS } from '../constants';
import { ErrorAlert, useAction, useLoad } from '../hooks';
import { autoAssign, isRequired, slotsOf } from '../lineup';
import { Formation, FormationsInfo, Match, MatchTeam, Slot, Team } from '../types';

interface Props {
  match: Match;
  formations: FormationsInfo;
  onChanged: () => void;
  readOnly?: boolean;
}

export function LineupEditor({ match, formations, onChanged, readOnly }: Props) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      {match.teams.map((mt) => (
        <SideLineup key={mt.id} match={match} matchTeam={mt} formations={formations} onChanged={onChanged} readOnly={readOnly} />
      ))}
    </Stack>
  );
}

function SideLineup({ match, matchTeam, formations, onChanged, readOnly }: Props & { matchTeam: MatchTeam }) {
  const { data: team } = useLoad(() => api.get<Team>(`/teams/${matchTeam.teamId}`), [matchTeam.teamId]);
  const { error, run } = useAction();
  const [formation, setFormation] = useState<Formation>(matchTeam.formation);
  const [assignment, setAssignment] = useState<Partial<Record<Slot, number>>>({});
  const locked = match.status === 'FINISHED' || readOnly;

  // Reset the form whenever the stored lineup changes.
  const stored = JSON.stringify([matchTeam.formation, matchTeam.lineup.map((l) => [l.slot, l.playerId])]);
  useEffect(() => {
    setFormation(matchTeam.formation);
    setAssignment(Object.fromEntries(matchTeam.lineup.map((l) => [l.slot, l.playerId])));
  }, [stored]);

  const players = team?.players ?? [];
  const slots = slotsOf(formations, formation);

  const save = () =>
    run(async () => {
      const lineup = slots.filter((s) => assignment[s]).map((slot) => ({ slot, playerId: assignment[slot] }));
      await api.put(`/matches/${match.id}/teams/${matchTeam.side}/lineup`, { formation, lineup });
      onChanged();
    });

  return (
    <Paper sx={{ p: 2, flex: 1 }}>
      <Typography variant="h6">{matchTeam.side}: {matchTeam.team.name}</Typography>
      <Stack spacing={1.5} sx={{ mt: 1 }}>
        <TextField
          size="small"
          select
          label="Formation"
          value={formation}
          disabled={locked}
          onChange={(e) => {
            setFormation(e.target.value as Formation);
            setAssignment({}); // changing the formation clears the lineup
          }}
        >
          {FORMATIONS.map((f) => <MenuItem key={f} value={f}>{FORMATION_LABEL[f]}</MenuItem>)}
        </TextField>
        {slots.map((slot) => (
          <TextField
            key={slot}
            size="small"
            select
            disabled={locked}
            label={`${slot}${isRequired(formations, formation, slot) ? '' : ' (optional)'} - ${formations.slotRoles[slot]}`}
            value={assignment[slot] ?? ''}
            onChange={(e) => setAssignment({ ...assignment, [slot]: e.target.value === '' ? undefined : Number(e.target.value) })}
          >
            <MenuItem value="">-</MenuItem>
            {players.map((p) => (
              <MenuItem key={p.id} value={p.id}>#{p.jerseyNumber} {p.name} ({p.role})</MenuItem>
            ))}
          </TextField>
        ))}
        <ErrorAlert error={error} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap>
          <Button disabled={locked} onClick={() => setAssignment(autoAssign(formations, formation, players))}>Auto-fill</Button>
          <Button variant="contained" disabled={locked} onClick={save}>Save lineup</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
