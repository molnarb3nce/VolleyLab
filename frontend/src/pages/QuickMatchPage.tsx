import AddIcon from '@mui/icons-material/Add';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import EditIcon from '@mui/icons-material/Edit';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import RemoveIcon from '@mui/icons-material/Remove';
import UndoIcon from '@mui/icons-material/Undo';
import {
  alpha,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { glassSubtle } from '../glass';
import {
  activeSet,
  bumpScore,
  countSetsWon,
  createInitialQuickMatch,
  finishActiveSet,
  loadQuickMatch,
  QuickMatchState,
  reopenLastFinishedSet,
  rerollNames,
  renameTeam,
  saveQuickMatch,
  setNumber,
} from '../quick-match';

function tapFeedback() {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* ignore */
  }
}

type Side = 'home' | 'away';

function TeamScorePanel({
  side,
  name,
  score,
  accent,
  onAdd,
  onSubtract,
  onEditName,
  compact,
}: {
  side: Side;
  name: string;
  score: number;
  accent: string;
  onAdd: () => void;
  onSubtract: () => void;
  onEditName: () => void;
  compact: boolean;
}) {
  const isHome = side === 'home';

  return (
    <Box
      component="section"
      aria-label={`${name}, ${score} points`}
      onClick={onAdd}
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        px: 2,
        py: compact ? 1.5 : 2,
        ...(!isHome && compact ? { pb: 'max(16px, env(safe-area-inset-bottom))' } : {}),
        background: isHome
          ? `linear-gradient(165deg, ${alpha(accent, 0.38)} 0%, ${alpha('#05070f', 0.92)} 72%)`
          : `linear-gradient(15deg, ${alpha(accent, 0.38)} 0%, ${alpha('#05070f', 0.92)} 72%)`,
        borderTop: isHome ? 'none' : `1px solid ${alpha('#fff', 0.08)}`,
        transition: 'background 0.25s ease',
        '&:active': {
          background: isHome
            ? `linear-gradient(165deg, ${alpha(accent, 0.52)} 0%, ${alpha('#05070f', 0.88)} 72%)`
            : `linear-gradient(15deg, ${alpha(accent, 0.52)} 0%, ${alpha('#05070f', 0.88)} 72%)`,
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ mb: 0.5 }}>
        <Typography
          variant={compact ? 'subtitle1' : 'h6'}
          fontWeight={700}
          textAlign="center"
          sx={{ maxWidth: '90%', lineHeight: 1.2 }}
        >
          {name}
        </Typography>
        <IconButton
          size="small"
          aria-label={`Rename ${name}`}
          onClick={(e) => {
            e.stopPropagation();
            onEditName();
          }}
          sx={{
            color: alpha('#fff', 0.7),
            '&:hover': { color: '#fff', background: alpha('#fff', 0.08) },
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Typography
        component="p"
        sx={{
          fontSize: compact ? 'clamp(3.5rem, 22vw, 6rem)' : 'clamp(4rem, 28vw, 7.5rem)',
          fontWeight: 800,
          lineHeight: 1,
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.04em',
          color: '#fff',
          textShadow: `0 8px 32px ${alpha(accent, 0.55)}`,
          '@keyframes scorePop': {
            '0%': { transform: 'scale(1)' },
            '40%': { transform: 'scale(1.06)' },
            '100%': { transform: 'scale(1)' },
          },
          animation: 'scorePop 0.22s ease-out',
        }}
        key={score}
      >
        {score}
      </Typography>

      <Typography
        variant="caption"
        textAlign="center"
        sx={{ mt: 1, color: alpha('#fff', 0.55), letterSpacing: 0.5 }}
      >
        Tap to +1
      </Typography>

      <IconButton
        aria-label={`Subtract point from ${name}`}
        onClick={(e) => {
          e.stopPropagation();
          onSubtract();
        }}
        disabled={score === 0}
        sx={{
          position: 'absolute',
          bottom: compact ? 8 : 12,
          [isHome ? 'right' : 'left']: 12,
          width: 44,
          height: 44,
          background: alpha('#000', 0.35),
          border: `1px solid ${alpha('#fff', 0.12)}`,
          '&:hover': { background: alpha('#000', 0.5) },
          '&.Mui-disabled': { opacity: 0.35 },
        }}
      >
        <RemoveIcon />
      </IconButton>
    </Box>
  );
}

export function QuickMatchPage() {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const [state, setState] = useState<QuickMatchState>(() => loadQuickMatch());
  const [editSide, setEditSide] = useState<Side | null>(null);
  const [editName, setEditName] = useState('');
  const [tieOpen, setTieOpen] = useState(false);

  useEffect(() => {
    saveQuickMatch(state);
  }, [state]);

  const apply = useCallback((updater: (s: QuickMatchState) => QuickMatchState) => {
    setState(updater);
  }, []);

  const current = activeSet(state);
  const won = countSetsWon(state);
  const setNo = setNumber(state);

  const addPoint = (side: Side) => {
    tapFeedback();
    apply((s) => bumpScore(s, side, 1));
  };

  const subPoint = (side: Side) => {
    tapFeedback();
    apply((s) => bumpScore(s, side, -1));
  };

  const finishSet = () => {
    apply((s) => {
      const next = finishActiveSet(s);
      if (next === 'tie') {
        setTieOpen(true);
        return s;
      }
      tapFeedback();
      return next;
    });
  };

  const newMatch = () => {
    if (!confirm('Start a new quick match? Scores are cleared (saved only on this device).')) return;
    setState(createInitialQuickMatch());
  };

  const openRename = (side: Side) => {
    setEditSide(side);
    setEditName(side === 'home' ? state.homeName : state.awayName);
  };

  const commitRename = () => {
    if (editSide) apply((s) => renameTeam(s, editSide, editName));
    setEditSide(null);
  };

  return (
    <Box
      sx={{
        mx: { xs: -2, sm: 0 },
        mb: { xs: -2, sm: 0 },
        minHeight: { xs: 'calc(100dvh - 56px - 32px)', sm: 'calc(100dvh - 64px - 48px)' },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          ...glassSubtle,
          borderRadius: { xs: 0, sm: 3 },
          px: 2,
          py: 1.25,
          flexShrink: 0,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="overline" sx={{ letterSpacing: 1.5, color: alpha('#fff', 0.6) }}>
            Quick match
          </Typography>
          <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            Set {setNo}
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ mt: 0.5 }}>
          <Box textAlign="center" sx={{ minWidth: 72 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              {state.homeName.split(' ')[0]}
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#818cf8', fontVariantNumeric: 'tabular-nums' }}>
              {won.home}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            sets
          </Typography>
          <Box textAlign="center" sx={{ minWidth: 72 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              {state.awayName.split(' ')[0]}
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#22d3ee', fontVariantNumeric: 'tabular-nums' }}>
              {won.away}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap sx={{ mt: 1.25 }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={finishSet}
            sx={{ flex: { xs: '1 1 45%', sm: '0 0 auto' } }}
          >
            Finish set
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<UndoIcon />}
            onClick={() => apply(reopenLastFinishedSet)}
            disabled={state.sets.filter((s) => s.finished).length === 0}
          >
            Undo set
          </Button>
          <Button size="small" variant="outlined" startIcon={<AutorenewIcon />} onClick={() => apply(rerollNames)}>
            Random names
          </Button>
          <Button size="small" variant="outlined" color="warning" startIcon={<FiberNewIcon />} onClick={newMatch}>
            New match
          </Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <TeamScorePanel
          side="home"
          name={state.homeName}
          score={current.homeScore}
          accent="#6366f1"
          onAdd={() => addPoint('home')}
          onSubtract={() => subPoint('home')}
          onEditName={() => openRename('home')}
          compact={compact}
        />
        <TeamScorePanel
          side="away"
          name={state.awayName}
          score={current.awayScore}
          accent="#06b6d4"
          onAdd={() => addPoint('away')}
          onSubtract={() => subPoint('away')}
          onEditName={() => openRename('away')}
          compact={compact}
        />
      </Box>

      <Dialog open={editSide !== null} onClose={() => setEditSide(null)} fullWidth maxWidth="xs">
        <DialogTitle>Team name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitRename()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditSide(null)}>Cancel</Button>
          <Button variant="contained" onClick={commitRename}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={tieOpen} onClose={() => setTieOpen(false)}>
        <DialogTitle>Tie score</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">Finish the set only when one team leads on points.</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setTieOpen(false)}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
