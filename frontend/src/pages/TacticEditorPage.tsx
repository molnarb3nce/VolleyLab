import {
  Alert,
  Button,
  IconButton,
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
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Court, toTokens } from '../components/Court';
import { ACTOR_SIDES, FORMATION_LABEL, FORMATIONS, TACTIC_ACTIONS } from '../constants';
import { startPositions, tokenKey } from '../court';
import { ErrorAlert, useAction, useFormations, useLoad } from '../hooks';
import { autoAssign, isRequired, slotsOf } from '../lineup';
import { usePlayback } from '../playback';
import { Formation, FormationsInfo, Slot, Tactic, TacticStep, Team } from '../types';

export function TacticEditorPage() {
  const id = Number(useParams().id);
  const info = useFormations();
  const { data: tactic, error: loadError, reload } = useLoad(() => api.get<Tactic>(`/tactics/${id}`), [id]);

  if (!tactic || !info) return <ErrorAlert error={loadError} />;
  return <Editor tactic={tactic} info={info} reload={reload} />;
}

function Editor({ tactic, info, reload }: { tactic: Tactic; info: FormationsInfo; reload: () => Promise<void> }) {
  const { error, run } = useAction();
  const [meta, setMeta] = useState({
    name: tactic.name,
    description: tactic.description ?? '',
    formation: tactic.formation,
    opponentFormation: tactic.opponentFormation,
  });
  const [steps, setSteps] = useState<TacticStep[]>(tactic.steps);
  const [selected, setSelected] = useState(0);

  const dirty = JSON.stringify(steps) !== JSON.stringify(tactic.steps);
  const start = startPositions(info, tactic.formation, tactic.opponentFormation);

  const slotsFor = (side: TacticStep['actorSide']): Slot[] =>
    side === 'BALL' ? [] : slotsOf(info, side === 'OWN' ? tactic.formation : tactic.opponentFormation);

  const update = (index: number, patch: Partial<TacticStep>) =>
    setSteps((list) => list.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const changeSide = (index: number, actorSide: TacticStep['actorSide']) =>
    update(index, {
      actorSide,
      slot: actorSide === 'BALL' ? null : slotsFor(actorSide)[0],
      targetSlot: null,
      action: actorSide === 'BALL' ? 'MOVE' : steps[index].action,
    });

  const addStep = () => {
    const slot = slotsFor('OWN')[0];
    const p = start[tokenKey('OWN', slot)];
    setSteps([...steps, { actorSide: 'OWN', slot, targetSlot: null, action: 'MOVE', x: p.x, y: p.y, duration: 800 }]);
    setSelected(steps.length);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    setSteps(next);
    setSelected(target);
  };

  const num = (value: string) => (value === '' ? 0 : Number(value));

  return (
    <Stack spacing={3}>
      <Typography variant="h4">{tactic.name}</Typography>
      <ErrorAlert error={error} />

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Details</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField size="small" label="Name" value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
          <TextField size="small" label="Description" sx={{ minWidth: 260 }} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
          {(['formation', 'opponentFormation'] as const).map((field) => (
            <TextField key={field} size="small" select sx={{ width: 150 }} label={field === 'formation' ? 'Own formation' : 'Opponent formation'} value={meta[field]} onChange={(e) => setMeta({ ...meta, [field]: e.target.value as Formation })}>
              {FORMATIONS.map((f) => <MenuItem key={f} value={f}>{FORMATION_LABEL[f]}</MenuItem>)}
            </TextField>
          ))}
          <Button variant="contained" onClick={() => run(async () => (await api.patch(`/tactics/${tactic.id}`, meta), await reload()))}>
            Save details
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Steps</Typography>
          <Stack direction="row" spacing={1}>
            <Button onClick={addStep}>Add step</Button>
            <Button
              variant="contained"
              disabled={!dirty}
              onClick={() => run(async () => (await api.put(`/tactics/${tactic.id}/steps`, { steps }), await reload()))}
            >
              Save steps
            </Button>
          </Stack>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Steps run in the listed order. Select a row, then click on the court to set its end position.
        </Typography>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mt: 1 }}>
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['#', 'Who', 'Slot', 'Action', 'Target', 'x', 'y', 'ms', ''].map((h) => <TableCell key={h}>{h}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {steps.map((s, i) => (
                  <TableRow key={i} hover selected={i === selected} onClick={() => setSelected(i)}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <TextField size="small" select value={s.actorSide} onChange={(e) => changeSide(i, e.target.value as TacticStep['actorSide'])}>
                        {ACTOR_SIDES.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField size="small" select sx={{ minWidth: 110 }} disabled={s.actorSide === 'BALL'} value={s.slot ?? ''} onChange={(e) => update(i, { slot: e.target.value as Slot })}>
                        {slotsFor(s.actorSide).map((slot) => <MenuItem key={slot} value={slot}>{slot}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField size="small" select disabled={s.actorSide === 'BALL'} value={s.action} onChange={(e) => update(i, { action: e.target.value as TacticStep['action'], targetSlot: null })}>
                        {TACTIC_ACTIONS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField size="small" select sx={{ minWidth: 110 }} disabled={s.action !== 'SET'} value={s.targetSlot ?? ''} onChange={(e) => update(i, { targetSlot: (e.target.value || null) as Slot | null })}>
                        <MenuItem value="">-</MenuItem>
                        {slotsFor(s.actorSide).map((slot) => <MenuItem key={slot} value={slot}>{slot}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell><TextField size="small" type="number" sx={{ width: 80 }} inputProps={{ min: 0, max: 9, step: 0.1 }} value={s.x} onChange={(e) => update(i, { x: num(e.target.value) })} /></TableCell>
                    <TableCell><TextField size="small" type="number" sx={{ width: 80 }} inputProps={{ min: 0, max: 18, step: 0.1 }} value={s.y} onChange={(e) => update(i, { y: num(e.target.value) })} /></TableCell>
                    <TableCell><TextField size="small" type="number" sx={{ width: 90 }} inputProps={{ min: 0, max: 10000, step: 100 }} value={s.duration} onChange={(e) => update(i, { duration: num(e.target.value) })} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <IconButton size="small" onClick={() => move(i, -1)}>↑</IconButton>
                      <IconButton size="small" onClick={() => move(i, 1)}>↓</IconButton>
                      <IconButton size="small" onClick={() => (setSteps(steps.filter((_, j) => j !== i)), setSelected(0))}>✕</IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {steps.length === 0 && <Typography color="text.secondary" sx={{ mt: 1 }}>No steps yet.</Typography>}
          </div>
          <Court
            tokens={toTokens(start)}
            markers={steps.map((s, i) => ({ x: s.x, y: s.y, label: String(i + 1), active: i === selected }))}
            onPick={(p) => steps[selected] && update(selected, p)}
          />
        </Stack>
      </Paper>

      <ValidateAndPlay tactic={tactic} info={info} dirty={dirty} />
    </Stack>
  );
}

/** The tactic is validated against a team first; only a valid tactic can be played. */
function ValidateAndPlay({ tactic, info, dirty }: { tactic: Tactic; info: FormationsInfo; dirty: boolean }) {
  const { data: teams } = useLoad(() => api.get<Team[]>('/teams'), []);
  const [teamId, setTeamId] = useState('');
  const { data: team } = useLoad(
    async () => (teamId ? api.get<Team>(`/teams/${teamId}`) : undefined),
    [teamId],
  );
  const [assignment, setAssignment] = useState<Partial<Record<Slot, number>>>({});
  const [result, setResult] = useState<{ valid: boolean; problems: string[] }>();
  const { error, run } = useAction();
  const playback = usePlayback(info, tactic.formation, tactic.opponentFormation, tactic.steps);

  // Any change invalidates an earlier validation result.
  const signature = JSON.stringify([tactic.steps, tactic.formation, teamId, assignment]);
  useEffect(() => setResult(undefined), [signature]);
  useEffect(() => setAssignment({}), [teamId]);

  const players = team?.players ?? [];
  const slots = slotsOf(info, tactic.formation);

  const validate = () =>
    run(async () => {
      const assignments = Object.fromEntries(Object.entries(assignment).filter(([, v]) => v));
      setResult(await api.post(`/tactics/${tactic.id}/validate`, { teamId: Number(teamId), assignments }));
    });

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <Paper sx={{ p: 2, flex: 1 }}>
        <Typography variant="h6" gutterBottom>Validate with a team</Typography>
        <Typography variant="caption" color="text.secondary">
          Checks the team's players, and the sequence against the basic volleyball rules (3 touches, block, libero, ...).
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField size="small" select label="Team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams?.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </TextField>
          {teamId && slots.map((slot) => (
            <TextField
              key={slot}
              size="small"
              select
              label={`${slot}${isRequired(info, tactic.formation, slot) ? '' : ' (optional)'} - ${info.slotRoles[slot]}`}
              value={assignment[slot] ?? ''}
              onChange={(e) => setAssignment({ ...assignment, [slot]: e.target.value === '' ? undefined : Number(e.target.value) })}
            >
              <MenuItem value="">-</MenuItem>
              {players.map((p) => <MenuItem key={p.id} value={p.id}>#{p.jerseyNumber} {p.name} ({p.role})</MenuItem>)}
            </TextField>
          ))}
          <Stack direction="row" spacing={1}>
            <Button disabled={!teamId} onClick={() => setAssignment(autoAssign(info, tactic.formation, players))}>Auto-fill</Button>
            <Button variant="contained" disabled={!teamId || dirty} onClick={validate}>Validate</Button>
          </Stack>
          {dirty && <Typography variant="caption" color="warning.main">Save the steps first: validation uses the saved tactic.</Typography>}
          <ErrorAlert error={error} />
          {result?.valid && <Alert severity="success">Valid: this team can play the tactic.</Alert>}
          {result && !result.valid && (
            <Alert severity="error">
              <b>Not playable:</b>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {result.problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </Alert>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, flex: 1 }}>
        <Typography variant="h6" gutterBottom>Playback</Typography>
        <Court tokens={toTokens(playback.positions)} transitionMs={playback.transitionMs} />
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <Button variant="contained" disabled={!result?.valid || playback.playing} onClick={playback.play}>Play</Button>
          <Button onClick={playback.reset}>Reset</Button>
          <Typography variant="body2">
            {playback.activeStep !== null && `Step ${playback.activeStep + 1} of ${tactic.steps.length}`}
          </Typography>
        </Stack>
        {!result?.valid && <Typography variant="caption" color="text.secondary">Validate the tactic successfully to enable playback.</Typography>}
      </Paper>
    </Stack>
  );
}
