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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Court, toTokens } from '../components/Court';
import { ACTOR_SIDES, FORMATION_LABEL, FORMATIONS, TACTIC_ACTIONS } from '../constants';
import { CourtSetup, Point, startingPositions, tokenKey } from '../court';
import { ErrorAlert, useAction, useFormations, useLoad } from '../hooks';
import { autoAssign, isRequired, slotsOf } from '../lineup';
import { usePlayback } from '../playback';
import { LIBERO_REPLACE_CHOICES, liberoOnCourt, onCourtTokenKey } from '../rotation';
import { normalizeStep, stepsEqual } from '../tactic-steps';
import { ActorSide, Formation, FormationsInfo, Slot, Tactic, TacticStep, Team } from '../types';

type EditMode = 'base' | 'step';

function tacticPatch(
  meta: {
    name: string;
    description: string;
    formation: Formation;
    opponentFormation: Formation;
    rotation: number;
    opponentRotation: number;
    liberoReplaces: Slot | null;
  },
  base: Record<string, Point>,
) {
  return {
    name: meta.name,
    description: meta.description || undefined,
    formation: meta.formation,
    opponentFormation: meta.opponentFormation,
    rotation: meta.rotation,
    opponentRotation: meta.opponentRotation,
    liberoReplaces: meta.liberoReplaces,
    basePositions: base,
  };
}

export function TacticEditorPage() {
  const id = Number(useParams().id);
  const info = useFormations();
  const { data: tactic, error: loadError, reload } = useLoad(() => api.get<Tactic>(`/tactics/${id}`), [id]);

  if (!tactic || !info) return <ErrorAlert error={loadError} />;
  return <Editor key={tactic.id} tactic={tactic} info={info} reload={reload} />;
}

function Editor({ tactic, info, reload }: { tactic: Tactic; info: FormationsInfo; reload: () => Promise<void> }) {
  const { error, run } = useAction();
  const [meta, setMeta] = useState({
    name: tactic.name,
    description: tactic.description ?? '',
    formation: tactic.formation,
    opponentFormation: tactic.opponentFormation,
    rotation: tactic.rotation ?? 1,
    opponentRotation: tactic.opponentRotation ?? 1,
    liberoReplaces: tactic.liberoReplaces ?? null,
  });
  const [base, setBase] = useState<Record<string, Point>>(tactic.basePositions ?? {});
  const [steps, setSteps] = useState<TacticStep[]>(() => tactic.steps.map(normalizeStep));
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<EditMode>('step');

  const stepsDirty = !stepsEqual(steps, tactic.steps);
  const baseDirty = JSON.stringify(base) !== JSON.stringify(tactic.basePositions ?? {});
  const metaDirty =
    meta.name !== tactic.name ||
    meta.description !== (tactic.description ?? '') ||
    meta.formation !== tactic.formation ||
    meta.opponentFormation !== tactic.opponentFormation ||
    meta.rotation !== (tactic.rotation ?? 1) ||
    meta.opponentRotation !== (tactic.opponentRotation ?? 1) ||
    meta.liberoReplaces !== (tactic.liberoReplaces ?? null);
  const dirty = stepsDirty || baseDirty || metaDirty;

  const courtSetup: CourtSetup = useMemo(
    () => ({
      ownFormation: meta.formation,
      opponentFormation: meta.opponentFormation,
      rotation: meta.rotation,
      opponentRotation: meta.opponentRotation,
      liberoReplaces: meta.liberoReplaces,
    }),
    [meta],
  );

  const defaults = useMemo(() => startingPositions(courtSetup), [courtSetup]);
  const bases = useMemo(() => ({ ...defaults, ...base }), [defaults, base]);

  const slotsFor = (side: ActorSide): Slot[] =>
    side === 'BALL' ? [] : slotsOf(info, side === 'OWN' ? meta.formation : meta.opponentFormation);

  const pointOf = (side: ActorSide, slot: Slot | null): Point => {
    if (!slot || side === 'BALL') return bases.BALL ?? { x: 4.5, y: 7 };
    const key =
      side === 'OWN'
        ? onCourtTokenKey('OWN', slot, meta.formation, meta.rotation, meta.liberoReplaces)
        : tokenKey(side, slot);
    return bases[key] ?? { x: 4.5, y: 12 };
  };

  const update = (index: number, patch: Partial<TacticStep>) =>
    setSteps((list) => list.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const changeSide = (index: number, actorSide: ActorSide) => {
    const slot = actorSide === 'BALL' ? null : slotsFor(actorSide)[0];
    const p = pointOf(actorSide, slot);
    update(index, {
      actorSide,
      slot,
      targetSlot: null,
      action: actorSide === 'BALL' ? 'MOVE' : steps[index].action,
      x: p.x,
      y: p.y,
    });
  };

  const addStep = () => {
    const slot = slotsFor('OWN')[0];
    const p = pointOf('OWN', slot);
    setSteps([
      ...steps,
      { actorSide: 'OWN', slot, targetSlot: null, action: 'RECEIVE', x: p.x, y: p.y, duration: 800, delay: 0 },
    ]);
    setSelected(steps.length);
    setMode('step');
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

  const selectedStep = steps[selected];
  const selectedKey =
    selectedStep && selectedStep.actorSide !== 'BALL' && selectedStep.slot
      ? selectedStep.actorSide === 'OWN'
        ? onCourtTokenKey('OWN', selectedStep.slot, meta.formation, meta.rotation, meta.liberoReplaces)
        : tokenKey(selectedStep.actorSide, selectedStep.slot)
      : selectedStep?.actorSide === 'BALL'
        ? 'BALL'
        : null;

  const editorPositions = useMemo(() => {
    if (mode === 'base' || !selectedStep) return bases;
    return { ...bases, [selectedKey!]: { x: selectedStep.x, y: selectedStep.y } };
  }, [mode, bases, selectedStep, selectedKey]);

  const editorTokens = toTokens(
    editorPositions,
    selectedKey && mode === 'step' ? { [selectedKey]: { highlight: true } } : {},
  );

  const onDragToken = (key: string, point: Point) => {
    if (mode === 'step' && selectedKey && key === selectedKey) {
      update(selected, point);
      return;
    }
    setBase((current) => ({ ...current, [key]: point }));
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4">{tactic.name}</Typography>
      <ErrorAlert error={error} />

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Details
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField size="small" label="Name" value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
          <TextField
            size="small"
            label="Description"
            sx={{ minWidth: 260 }}
            value={meta.description}
            onChange={(e) => setMeta({ ...meta, description: e.target.value })}
          />
          {(['formation', 'opponentFormation'] as const).map((field) => (
            <TextField
              key={field}
              size="small"
              select
              sx={{ width: 150 }}
              label={field === 'formation' ? 'Own formation' : 'Opponent formation'}
              value={meta[field]}
              onChange={(e) => setMeta({ ...meta, [field]: e.target.value as Formation })}
            >
              {FORMATIONS.map((f) => (
                <MenuItem key={f} value={f}>
                  {FORMATION_LABEL[f]}
                </MenuItem>
              ))}
            </TextField>
          ))}
          <TextField
            size="small"
            select
            sx={{ width: 130 }}
            label="Rotation"
            value={meta.rotation}
            onChange={(e) => setMeta({ ...meta, rotation: Number(e.target.value) })}
          >
            {[1, 2, 3, 4, 5, 6].map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            select
            sx={{ width: 150 }}
            label="Opponent rot."
            value={meta.opponentRotation}
            onChange={(e) => setMeta({ ...meta, opponentRotation: Number(e.target.value) })}
          >
            {[1, 2, 3, 4, 5, 6].map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            select
            sx={{ minWidth: 200 }}
            label="Libero replaces"
            value={meta.liberoReplaces ?? ''}
            onChange={(e) =>
              setMeta({ ...meta, liberoReplaces: (e.target.value || null) as Slot | null })
            }
          >
            <MenuItem value="">Nobody (libero off court)</MenuItem>
            {LIBERO_REPLACE_CHOICES.filter((s) => slotsOf(info, meta.formation).includes(s)).map((slot) => (
              <MenuItem key={slot} value={slot}>
                {slot}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={!metaDirty && !baseDirty}
            onClick={() =>
              run(async () => {
                await api.patch(`/tactics/${tactic.id}`, tacticPatch(meta, base));
                await reload();
              })
            }
          >
            Save details
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Rotation 1: setter zone 1, MB1 zone 6, OH1 zone 5, opposite zone 4, MB2 zone 3, OH2 zone 2. Each rotation moves
          everyone one zone clockwise.{' '}
          {meta.liberoReplaces &&
            (liberoOnCourt(meta.formation, meta.rotation, meta.liberoReplaces)
              ? `Libero is on for ${meta.liberoReplaces} (back row).`
              : `Libero is off: ${meta.liberoReplaces} is front row.`)}
        </Typography>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1}>
          <Typography variant="h6">Steps</Typography>
          <Stack direction="row" spacing={1}>
            <Button onClick={addStep}>Add step</Button>
            <Button
              variant="contained"
              disabled={!dirty}
              onClick={() =>
                run(async () => {
                  if (metaDirty || baseDirty) await api.patch(`/tactics/${tactic.id}`, tacticPatch(meta, base));
                  if (stepsDirty) await api.put(`/tactics/${tactic.id}/steps`, { steps: steps.map(normalizeStep) });
                  await reload();
                })
              }
            >
              Save steps
            </Button>
          </Stack>
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          You do not need a ball step: on receive / set / attack / block the ball flies to that player. Tempo is how long
          the player waits (from their base) before running; they meet the ball at the end of Flight.
        </Typography>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mt: 1 }} alignItems="flex-start">
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['#', 'Who', 'Slot', 'Action', 'Target', 'x', 'y', 'Flight', 'Tempo', ''].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {steps.map((s, i) => (
                  <TableRow key={i} hover selected={i === selected} onClick={() => setSelected(i)}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        select
                        value={s.actorSide}
                        onChange={(e) => changeSide(i, e.target.value as ActorSide)}
                      >
                        {ACTOR_SIDES.map((a) => (
                          <MenuItem key={a} value={a}>
                            {a}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        select
                        sx={{ minWidth: 110 }}
                        disabled={s.actorSide === 'BALL'}
                        value={s.slot ?? ''}
                        onChange={(e) => update(i, { slot: e.target.value as Slot })}
                      >
                        {slotsFor(s.actorSide).map((slot) => (
                          <MenuItem key={slot} value={slot}>
                            {slot}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        select
                        disabled={s.actorSide === 'BALL'}
                        value={s.action}
                        onChange={(e) => update(i, { action: e.target.value as TacticStep['action'], targetSlot: null })}
                      >
                        {TACTIC_ACTIONS.map((a) => (
                          <MenuItem key={a} value={a}>
                            {a}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        select
                        sx={{ minWidth: 110 }}
                        disabled={s.action !== 'SET'}
                        value={s.targetSlot ?? ''}
                        onChange={(e) => update(i, { targetSlot: (e.target.value || null) as Slot | null })}
                      >
                        <MenuItem value="">-</MenuItem>
                        {slotsFor(s.actorSide).map((slot) => (
                          <MenuItem key={slot} value={slot}>
                            {slot}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        sx={{ width: 80 }}
                        inputProps={{ min: 0, max: 9, step: 0.1 }}
                        value={s.x}
                        onChange={(e) => update(i, { x: num(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        sx={{ width: 80 }}
                        inputProps={{ min: 0, max: 18, step: 0.1 }}
                        value={s.y}
                        onChange={(e) => update(i, { y: num(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        sx={{ width: 90 }}
                        inputProps={{ min: 0, max: 10000, step: 100 }}
                        value={s.duration}
                        onChange={(e) => update(i, { duration: num(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        sx={{ width: 90 }}
                        inputProps={{ min: 0, max: 10000, step: 50 }}
                        value={s.delay ?? 0}
                        onChange={(e) => update(i, { delay: num(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <IconButton size="small" onClick={() => move(i, -1)}>
                        ↑
                      </IconButton>
                      <IconButton size="small" onClick={() => move(i, 1)}>
                        ↓
                      </IconButton>
                      <IconButton size="small" onClick={() => (setSteps(steps.filter((_, j) => j !== i)), setSelected(0))}>
                        ✕
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {steps.length === 0 && (
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                No steps yet.
              </Typography>
            )}
          </div>
          <Stack spacing={1} sx={{ minWidth: 280 }}>
            <ToggleButtonGroup exclusive size="small" value={mode} onChange={(_, v: EditMode | null) => v && setMode(v)}>
              <ToggleButton value="base">Base positions</ToggleButton>
              <ToggleButton value="step">Step position</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary">
              {mode === 'base'
                ? 'Drag any circle to set where that player (or the ball) starts. Players wait here until their step.'
                : 'Select a step, then drag the highlighted player to the position of that action.'}
            </Typography>
            <Court
              tokens={editorTokens}
              ghosts={
                mode === 'step' && selectedKey && bases[selectedKey]
                  ? [{ key: `ghost:${selectedKey}`, ...bases[selectedKey] }]
                  : []
              }
              markers={steps.map((s, i) => ({ x: s.x, y: s.y, label: String(i + 1), active: i === selected }))}
              onPick={mode === 'step' && selectedStep ? (p) => update(selected, p) : undefined}
              onDragToken={onDragToken}
            />
          </Stack>
        </Stack>
      </Paper>

      <ValidateAndPlay tactic={tactic} info={info} dirty={dirty} steps={steps} base={base} courtSetup={courtSetup} />
    </Stack>
  );
}

/** Team assignment and play-rule check. Playback uses the current (possibly unsaved) steps. */
function ValidateAndPlay({
  tactic,
  info,
  dirty,
  steps,
  base,
  courtSetup,
}: {
  tactic: Tactic;
  info: FormationsInfo;
  dirty: boolean;
  steps: TacticStep[];
  base: Record<string, Point>;
  courtSetup: CourtSetup;
}) {
  const { data: teams } = useLoad(() => api.get<Team[]>('/teams'), []);
  const [teamId, setTeamId] = useState('');
  const { data: team } = useLoad(
    async () => (teamId ? api.get<Team>(`/teams/${teamId}`) : undefined),
    [teamId],
  );
  const [assignment, setAssignment] = useState<Partial<Record<Slot, number>>>({});
  const [result, setResult] = useState<{ valid: boolean; problems: string[] }>();
  const { error, run } = useAction();
  const playback = usePlayback(courtSetup, steps, base);

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

  const playbackTokens = toTokens(
    playback.positions,
    Object.fromEntries(Object.entries(playback.transitions).map(([key, ms]) => [key, { transitionMs: ms }])),
  );

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <Paper sx={{ p: 2, flex: 1 }}>
        <Typography variant="h6" gutterBottom>
          Validate with a team
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Checks the team's players, and the sequence against the basic volleyball rules (3 touches, block, libero, ...).
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField size="small" select label="Team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams?.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>
          {teamId &&
            slots.map((slot) => (
              <TextField
                key={slot}
                size="small"
                select
                label={`${slot}${isRequired(info, tactic.formation, slot) ? '' : ' (optional)'} - ${info.slotRoles[slot]}`}
                value={assignment[slot] ?? ''}
                onChange={(e) =>
                  setAssignment({ ...assignment, [slot]: e.target.value === '' ? undefined : Number(e.target.value) })
                }
              >
                <MenuItem value="">-</MenuItem>
                {players.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    #{p.jerseyNumber} {p.name} ({p.role})
                  </MenuItem>
                ))}
              </TextField>
            ))}
          <Stack direction="row" spacing={1}>
            <Button disabled={!teamId} onClick={() => setAssignment(autoAssign(info, tactic.formation, players))}>
              Auto-fill
            </Button>
            <Button variant="contained" disabled={!teamId || dirty} onClick={validate}>
              Validate
            </Button>
          </Stack>
          {dirty && (
            <Typography variant="caption" color="warning.main">
              Save the steps and base positions first: validation uses the saved tactic.
            </Typography>
          )}
          <ErrorAlert error={error} />
          {result?.valid && <Alert severity="success">Valid: this team can play the tactic.</Alert>}
          {result && !result.valid && (
            <Alert severity="error">
              <b>Not playable:</b>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {result.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Alert>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, flex: 1 }}>
        <Typography variant="h6" gutterBottom>
          Playback
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Players start at their base. Each contact flies the ball to that player; after an attack it continues over the net.
        </Typography>
        <Court tokens={playbackTokens} />
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <Button variant="contained" disabled={steps.length === 0 || playback.playing} onClick={playback.play}>
            Play
          </Button>
          <Button onClick={playback.reset}>Reset</Button>
          <Typography variant="body2">
            {playback.activeStep !== null && `Step ${playback.activeStep + 1} of ${steps.length}`}
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}
