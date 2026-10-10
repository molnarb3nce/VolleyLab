import AddIcon from '@mui/icons-material/Add';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import EditIcon from '@mui/icons-material/Edit';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
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
type PanelLayout = 'portrait' | 'landscape';

function TeamScorePanel({
  side,
  name,
  score,
  accent,
  onAdd,
  onSubtract,
  onEditName,
  compact,
  layout,
}: {
  side: Side;
  name: string;
  score: number;
  accent: string;
  onAdd: () => void;
  onSubtract: () => void;
  onEditName: () => void;
  compact: boolean;
  layout: PanelLayout;
}) {
  const isHome = side === 'home';
  const landscape = layout === 'landscape';

  return (
    <Box
      component="section"
      aria-label={`${name}, ${score} points`}
      onClick={onAdd}
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        px: landscape ? 1.5 : 2,
        py: landscape ? 1 : compact ? 1.5 : 2,
        ...(!landscape && !isHome && compact ? { pb: 'max(16px, env(safe-area-inset-bottom))' } : {}),
        background: landscape
          ? isHome
            ? `linear-gradient(90deg, ${alpha(accent, 0.42)} 0%, ${alpha('#05070f', 0.94)} 85%)`
            : `linear-gradient(270deg, ${alpha(accent, 0.42)} 0%, ${alpha('#05070f', 0.94)} 85%)`
          : isHome
            ? `linear-gradient(165deg, ${alpha(accent, 0.38)} 0%, ${alpha('#05070f', 0.92)} 72%)`
            : `linear-gradient(15deg, ${alpha(accent, 0.38)} 0%, ${alpha('#05070f', 0.92)} 72%)`,
        borderTop: !landscape && !isHome ? `1px solid ${alpha('#fff', 0.08)}` : 'none',
        borderLeft: landscape && !isHome ? `1px solid ${alpha('#fff', 0.1)}` : 'none',
        transition: 'background 0.25s ease',
        '&:active': {
          background: landscape
            ? isHome
              ? `linear-gradient(90deg, ${alpha(accent, 0.55)} 0%, ${alpha('#05070f', 0.9)} 85%)`
              : `linear-gradient(270deg, ${alpha(accent, 0.55)} 0%, ${alpha('#05070f', 0.9)} 85%)`
            : isHome
              ? `linear-gradient(165deg, ${alpha(accent, 0.52)} 0%, ${alpha('#05070f', 0.88)} 72%)`
              : `linear-gradient(15deg, ${alpha(accent, 0.52)} 0%, ${alpha('#05070f', 0.88)} 72%)`,
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ mb: landscape ? 0 : 0.5 }}>
        <Typography
          variant={landscape ? 'body2' : compact ? 'subtitle1' : 'h6'}
          fontWeight={700}
          textAlign="center"
          noWrap={landscape}
          sx={{ maxWidth: landscape ? '85%' : '90%', lineHeight: 1.2 }}
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
          fontSize: landscape
            ? 'clamp(2.75rem, 52vmin, 5.5rem)'
            : compact
              ? 'clamp(3.5rem, 22vw, 6rem)'
              : 'clamp(4rem, 28vw, 7.5rem)',
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

      {!landscape && (
        <Typography
          variant="caption"
          textAlign="center"
          sx={{ mt: 1, color: alpha('#fff', 0.55), letterSpacing: 0.5 }}
        >
          Tap to +1
        </Typography>
      )}

      <IconButton
        aria-label={`Subtract point from ${name}`}
        onClick={(e) => {
          e.stopPropagation();
          onSubtract();
        }}
        disabled={score === 0}
        sx={{
          position: 'absolute',
          bottom: landscape ? 6 : compact ? 8 : 12,
          ...(landscape
            ? { left: '50%', transform: 'translateX(-50%)' }
            : { [isHome ? 'right' : 'left']: 12 }),
          width: landscape ? 40 : 44,
          height: landscape ? 40 : 44,
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

/** Short viewport in landscape ≈ phone on its side (not tablet/desktop). */
function usePhoneLandscape() {
  return useMediaQuery('(orientation: landscape) and (max-height: 520px)');
}

export function QuickMatchPage() {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const phoneLandscape = usePhoneLandscape();
  const panelLayout: PanelLayout = phoneLandscape ? 'landscape' : 'portrait';
  const [state, setState] = useState<QuickMatchState>(() => loadQuickMatch());
  const [editSide, setEditSide] = useState<Side | null>(null);
  const [editName, setEditName] = useState('');
  const [tieOpen, setTieOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

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

  const canUndoSet = state.sets.filter((s) => s.finished).length > 0;

  const closeMenu = () => setMenuAnchor(null);

  return (
    <Box
      sx={{
        mx: phoneLandscape ? 0 : { xs: -2, sm: 0 },
        mb: phoneLandscape ? 0 : { xs: -2, sm: 0 },
        minHeight: phoneLandscape
          ? 'auto'
          : { xs: 'calc(100dvh - 56px - 32px)', sm: 'calc(100dvh - 64px - 48px)' },
        ...(phoneLandscape
          ? {
              position: 'fixed',
              top: { xs: 56, sm: 64 },
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: theme.zIndex.appBar - 1,
              pl: 'env(safe-area-inset-left)',
              pr: 'env(safe-area-inset-right)',
              pb: 'env(safe-area-inset-bottom)',
            }
          : {}),
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          ...glassSubtle,
          borderRadius: phoneLandscape ? 0 : { xs: 0, sm: 3 },
          px: phoneLandscape ? 1.5 : 2,
          py: phoneLandscape ? 0.75 : 1.25,
          flexShrink: 0,
        }}
      >
        {phoneLandscape ? (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 40 }}>
            <Typography variant="caption" fontWeight={700} sx={{ color: alpha('#fff', 0.55), flexShrink: 0 }}>
              Set {setNo}
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ flex: 1, justifyContent: 'center' }}>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#818cf8', fontVariantNumeric: 'tabular-nums' }}>
                {won.home}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                sets
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#22d3ee', fontVariantNumeric: 'tabular-nums' }}>
                {won.away}
              </Typography>
            </Stack>
            <Button size="small" variant="contained" onClick={finishSet} sx={{ minWidth: 0, px: 1.5, flexShrink: 0 }}>
              Finish
            </Button>
            <IconButton
              aria-label="More actions"
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ flexShrink: 0 }}
            >
              <MoreHorizIcon />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
              <MenuItem
                disabled={!canUndoSet}
                onClick={() => {
                  apply(reopenLastFinishedSet);
                  closeMenu();
                }}
              >
                <ListItemIcon>
                  <UndoIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Undo set</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  apply(rerollNames);
                  closeMenu();
                }}
              >
                <ListItemIcon>
                  <AutorenewIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Random names</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  closeMenu();
                  newMatch();
                }}
              >
                <ListItemIcon>
                  <FiberNewIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>New match</ListItemText>
              </MenuItem>
            </Menu>
          </Stack>
        ) : (
          <>
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
                disabled={!canUndoSet}
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
          </>
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: phoneLandscape ? 'row' : 'column',
          minHeight: 0,
        }}
      >
        <TeamScorePanel
          side="home"
          name={state.homeName}
          score={current.homeScore}
          accent="#6366f1"
          onAdd={() => addPoint('home')}
          onSubtract={() => subPoint('home')}
          onEditName={() => openRename('home')}
          compact={compact}
          layout={panelLayout}
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
          layout={panelLayout}
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
