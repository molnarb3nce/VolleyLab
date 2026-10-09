import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Court, toTokens } from '../components/Court';
import {
  ACTOR_SIDE_LABEL,
  ACTOR_SIDES,
  FORMATION_LABEL,
  FORMATIONS,
  SLOT_SHORT,
  TACTIC_ACTION_LABEL,
  TACTIC_ACTIONS,
} from '../constants';
import { CourtSetup, Point, startingPositions, tokenKey } from '../court';
import { gradientBrandText } from '../glass';
import { ErrorAlert, useAction, useFormations, useLoad } from '../hooks';
import { autoAssign, isRequired, slotsOf } from '../lineup';
import { usePlayback } from '../playback';
import {
  LIBERO_REPLACE_CHOICES,
  liberoAtZone1,
  liberoMaskedSlot,
  liberoOnCourt,
  onCourtTokenKey,
} from '../rotation';
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

function stepTitle(s: TacticStep, index: number): string {
  if (s.actorSide === 'BALL') return `Step ${index + 1} · Ball`;
  const slot = s.slot ? (SLOT_SHORT[s.slot] ?? s.slot) : '?';
  return `Step ${index + 1} · ${TACTIC_ACTION_LABEL[s.action]} (${slot})`;
}

function stepSubtitle(s: TacticStep, index: number): string {
  const side = ACTOR_SIDE_LABEL[s.actorSide];
  return s.parallelWithPrevious && index > 0 ? `${side} · parallel with step ${index}` : side;
}

function StepList({
  steps,
  selected,
  onSelect,
  onMove,
  onRemove,
}: {
  steps: TacticStep[];
  selected: number;
  onSelect: (i: number) => void;
  onMove: (i: number, delta: number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', maxHeight: 420, overflowY: 'auto' }}>
      {steps.length === 0 ? (
        <Typography color="text.secondary" sx={{ p: 2 }}>
          No steps yet. Add one to build the play.
        </Typography>
      ) : (
        <List dense disablePadding>
          {steps.map((s, i) => (
            <ListItem
              key={i}
              disablePadding
              secondaryAction={
                <Stack direction="row" spacing={0}>
                  <IconButton size="small" aria-label="Move up" disabled={i === 0} onClick={() => onMove(i, -1)}>
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="Move down"
                    disabled={i === steps.length - 1}
                    onClick={() => onMove(i, 1)}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" aria-label="Delete step" onClick={() => onRemove(i)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              }
            >
              <ListItemButton selected={i === selected} onClick={() => onSelect(i)}>
                <ListItemText primary={stepTitle(s, i)} secondary={stepSubtitle(s, i)} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}

export function TacticEditorPage() {
  const id = Number(useParams().id);
  const info = useFormations();
  const { data: tactic, error: loadError, reload } = useLoad(() => api.get<Tactic>(`/tactics/${id}`), [id]);

  if (!tactic || !info) return <ErrorAlert error={loadError} />;
  return <Editor key={tactic.id} tactic={tactic} info={info} reload={reload} />;
}

function Editor({ tactic, info, reload }: { tactic: Tactic; info: FormationsInfo; reload: () => Promise<void> }) {
  const theme = useTheme();
  const compactSteps = useMediaQuery(theme.breakpoints.down('md'));
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [setupExpanded, setSetupExpanded] = useState(false);

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

  useEffect(() => {
    if (metaDirty || baseDirty) setSetupExpanded(true);
  }, [metaDirty, baseDirty]);

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

  const bases = useMemo(() => startingPositions(courtSetup, base), [courtSetup, base]);

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

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, j) => j !== index));
    setSelected(Math.max(0, index - 1));
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

  const saveAll = () =>
    run(async () => {
      if (metaDirty || baseDirty) await api.patch(`/tactics/${tactic.id}`, tacticPatch(meta, base));
      if (stepsDirty) await api.put(`/tactics/${tactic.id}/steps`, { steps: steps.map(normalizeStep) });
      await reload();
    });

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
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
        <Button component={Link} to="/tactics" startIcon={<ArrowBackIcon />} color="inherit" sx={{ color: 'text.secondary' }}>
          All tactics
        </Button>
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Typography variant="h5" noWrap sx={gradientBrandText}>
            {meta.name || 'Untitled tactic'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {FORMATION_LABEL[meta.formation]} vs {FORMATION_LABEL[meta.opponentFormation]}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={dirty ? 'Unsaved changes' : 'Up to date'}
          color={dirty ? 'warning' : 'success'}
          variant="outlined"
        />
        <Button variant="contained" startIcon={<SaveIcon />} disabled={!dirty} onClick={saveAll}>
          Save
        </Button>
      </Stack>

      <ErrorAlert error={error} />

      <Accordion expanded={setupExpanded} onChange={(_, open) => setSetupExpanded(open)} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Setup</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1.5 }}>
            Formations, rotation, libero, starting positions
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <TextField
                size="small"
                label="Name"
                value={meta.name}
                onChange={(e) => setMeta({ ...meta, name: e.target.value })}
              />
              <TextField
                size="small"
                label="Description"
                sx={{ minWidth: 260, flex: 1 }}
                value={meta.description}
                onChange={(e) => setMeta({ ...meta, description: e.target.value })}
              />
            </Stack>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {(['formation', 'opponentFormation'] as const).map((field) => (
                <TextField
                  key={field}
                  size="small"
                  select
                  sx={{ width: 160 }}
                  label={field === 'formation' ? 'Our formation' : 'Opponent'}
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
                sx={{ width: 120 }}
                label="Our rotation"
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
                sx={{ width: 140 }}
                label="Opponent rotation"
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
                sx={{ minWidth: 220 }}
                label="Libero replaces"
                value={meta.liberoReplaces ?? ''}
                onChange={(e) =>
                  setMeta({ ...meta, liberoReplaces: (e.target.value || null) as Slot | null })
                }
              >
                <MenuItem value="">Libero off court</MenuItem>
                {LIBERO_REPLACE_CHOICES.filter((s) => slotsOf(info, meta.formation).includes(s)).map((slot) => (
                  <MenuItem key={slot} value={slot}>
                    {slot}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Rotation 1: S1→1, M1→6, O1→5, OP→4, M2→3, O2→2. Each rotation subtracts 1 from every zone (1 wraps to 6).
              {meta.liberoReplaces &&
                (liberoAtZone1(meta.formation, meta.rotation, meta.liberoReplaces)
                  ? ` Libero in zone 1 (covers ${liberoMaskedSlot(meta.formation, meta.rotation, meta.liberoReplaces)}); ${meta.liberoReplaces} plays zone 4.`
                  : liberoOnCourt(meta.formation, meta.rotation, meta.liberoReplaces)
                    ? liberoMaskedSlot(meta.formation, meta.rotation, meta.liberoReplaces) === meta.liberoReplaces
                      ? ` Libero on for ${meta.liberoReplaces} (back row).`
                      : ` Libero covers ${liberoMaskedSlot(meta.formation, meta.rotation, meta.liberoReplaces)} (${meta.liberoReplaces} on court).`
                    : '')}
            </Typography>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Paper sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1}>
          <Box>
            <Typography variant="h6">Sequence</Typography>
            <Typography variant="body2" color="text.secondary">
              Pick a step, set who does what, then drag on the court. Ball flight is automatic on contacts.
            </Typography>
          </Box>
          <Button startIcon={<AddIcon />} variant="outlined" onClick={addStep}>
            Add step
          </Button>
        </Stack>

        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={4}>
            {compactSteps ? (
              <Accordion
                defaultExpanded={false}
                disableGutters
                sx={{ borderRadius: 2, overflow: 'hidden', '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight={600}>Steps ({steps.length})</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <StepList
                    steps={steps}
                    selected={selected}
                    onSelect={setSelected}
                    onMove={move}
                    onRemove={removeStep}
                  />
                </AccordionDetails>
              </Accordion>
            ) : (
              <StepList
                steps={steps}
                selected={selected}
                onSelect={setSelected}
                onMove={move}
                onRemove={removeStep}
              />
            )}
          </Grid>

          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              {selectedStep ? (
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  <TextField
                    size="small"
                    select
                    label="Team"
                    sx={{ minWidth: 130 }}
                    value={selectedStep.actorSide}
                    onChange={(e) => changeSide(selected, e.target.value as ActorSide)}
                  >
                    {ACTOR_SIDES.map((a) => (
                      <MenuItem key={a} value={a}>
                        {ACTOR_SIDE_LABEL[a]}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    select
                    label="Player"
                    sx={{ minWidth: 120 }}
                    disabled={selectedStep.actorSide === 'BALL'}
                    value={selectedStep.slot ?? ''}
                    onChange={(e) => {
                      const slot = e.target.value as Slot;
                      const p = pointOf(selectedStep.actorSide, slot);
                      update(selected, { slot, x: p.x, y: p.y });
                    }}
                  >
                    {slotsFor(selectedStep.actorSide).map((slot) => (
                      <MenuItem key={slot} value={slot}>
                        {SLOT_SHORT[slot] ?? slot}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    select
                    label="Action"
                    sx={{ minWidth: 120 }}
                    disabled={selectedStep.actorSide === 'BALL'}
                    value={selectedStep.action}
                    onChange={(e) =>
                      update(selected, { action: e.target.value as TacticStep['action'], targetSlot: null })
                    }
                  >
                    {TACTIC_ACTIONS.map((a) => (
                      <MenuItem key={a} value={a}>
                        {TACTIC_ACTION_LABEL[a]}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    select
                    label="Set target"
                    sx={{ minWidth: 120 }}
                    disabled={selectedStep.action !== 'SET'}
                    value={selectedStep.targetSlot ?? ''}
                    onChange={(e) => update(selected, { targetSlot: (e.target.value || null) as Slot | null })}
                  >
                    <MenuItem value="">—</MenuItem>
                    {slotsFor(selectedStep.actorSide).map((slot) => (
                      <MenuItem key={slot} value={slot}>
                        {SLOT_SHORT[slot] ?? slot}
                      </MenuItem>
                    ))}
                  </TextField>
                  <ToggleButton
                    size="small"
                    value="parallel"
                    selected={!!selectedStep.parallelWithPrevious}
                    disabled={selected === 0}
                    onChange={() =>
                      update(selected, { parallelWithPrevious: !selectedStep.parallelWithPrevious })
                    }
                    sx={{ px: 1.5, textTransform: 'none' }}
                  >
                    With previous step
                  </ToggleButton>
                </Stack>
              ) : (
                <Typography color="text.secondary">Select or add a step to edit it on the court.</Typography>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
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
              </Box>

              <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={mode}
                  onChange={(_, v: EditMode | null) => v && setMode(v)}
                >
                  <ToggleButton value="base">Starting positions</ToggleButton>
                  <ToggleButton value="step">This step</ToggleButton>
                </ToggleButtonGroup>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 200 }}>
                  {mode === 'base'
                    ? 'Drag any token to set where players wait before their step.'
                    : 'Drag the highlighted player to the contact point (or tap the court).'}
                </Typography>
              </Stack>

              {selectedStep && (
                <>
                  <Button size="small" onClick={() => setAdvancedOpen((o) => !o)} sx={{ alignSelf: 'flex-start' }}>
                    {advancedOpen ? 'Hide' : 'Show'} timing & coordinates
                  </Button>
                  <Collapse in={advancedOpen}>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
                      <TextField
                        size="small"
                        type="number"
                        label="X"
                        sx={{ width: 88 }}
                        inputProps={{ min: 0, max: 9, step: 0.1 }}
                        value={selectedStep.x}
                        onChange={(e) => update(selected, { x: num(e.target.value) })}
                      />
                      <TextField
                        size="small"
                        type="number"
                        label="Y"
                        sx={{ width: 88 }}
                        inputProps={{ min: 0, max: 18, step: 0.1 }}
                        value={selectedStep.y}
                        onChange={(e) => update(selected, { y: num(e.target.value) })}
                      />
                      <TextField
                        size="small"
                        type="number"
                        label="Flight (ms)"
                        sx={{ width: 120 }}
                        inputProps={{ min: 0, max: 10000, step: 100 }}
                        value={selectedStep.duration}
                        onChange={(e) => update(selected, { duration: num(e.target.value) })}
                      />
                      <TextField
                        size="small"
                        type="number"
                        label="Tempo (ms)"
                        sx={{ width: 120 }}
                        helperText="Wait before moving from base"
                        inputProps={{ min: 0, max: 10000, step: 50 }}
                        value={selectedStep.delay ?? 0}
                        onChange={(e) => update(selected, { delay: num(e.target.value) })}
                      />
                    </Stack>
                  </Collapse>
                </>
              )}
            </Stack>
          </Grid>
        </Grid>
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
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2.5, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Check with a team
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Assign real players and verify the sequence against volleyball rules (touches, libero, block, …).
          </Typography>
          <Stack spacing={1.5}>
            <TextField size="small" select label="Team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <MenuItem value="">Choose a team…</MenuItem>
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
                  label={`${SLOT_SHORT[slot] ?? slot}${isRequired(info, tactic.formation, slot) ? '' : ' (opt.)'} · ${info.slotRoles[slot]}`}
                  value={assignment[slot] ?? ''}
                  onChange={(e) =>
                    setAssignment({ ...assignment, [slot]: e.target.value === '' ? undefined : Number(e.target.value) })
                  }
                >
                  <MenuItem value="">—</MenuItem>
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
              <Typography variant="body2" color="warning.main">
                Save your changes first — validation uses the saved tactic on the server.
              </Typography>
            )}
            <ErrorAlert error={error} />
            {result?.valid && <Alert severity="success">This team can run the tactic.</Alert>}
            {result && !result.valid && (
              <Alert severity="error">
                <Typography fontWeight={600} gutterBottom>
                  Cannot play as drawn
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {result.problems.map((p) => (
                    <li key={p}>
                      <Typography variant="body2">{p}</Typography>
                    </li>
                  ))}
                </Box>
              </Alert>
            )}
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2.5, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Preview
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Players start at their base positions. Contacts move the ball; attacks continue over the net.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Court tokens={playbackTokens} />
          </Box>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              disabled={steps.length === 0 || playback.playing}
              onClick={playback.play}
            >
              Play
            </Button>
            <Button startIcon={<RestartAltIcon />} onClick={playback.reset}>
              Reset
            </Button>
            {playback.activeStep !== null && (
              <Chip
                size="small"
                label={`Step ${playback.activeStep + 1} / ${steps.length}`}
                variant="outlined"
              />
            )}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}
