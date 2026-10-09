import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SportsVolleyballIcon from '@mui/icons-material/SportsVolleyball';
import { alpha, Box, Button, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { ActionMixChart, EfficiencyRing, StatHighlightGrid } from '../components/StatCharts';
import { StatsGrid } from '../components/StatsTable';
import { glass, gradientBrandText } from '../glass';
import { ErrorAlert, useLoad } from '../hooks';
import { attackEfficiency, formatRole, receptionPositiveRate, totalTouches } from '../stats-display';
import { EventAction, PlayerStatistics, Stats } from '../types';

function playerActionRows(s: Stats): { action: EventAction; count: number }[] {
  return [
    { action: 'SERVE', count: s.serve.attempts },
    { action: 'RECEPTION', count: s.reception.attempts },
    { action: 'SET', count: s.set.attempts },
    { action: 'ATTACK', count: s.attack.attempts },
    { action: 'BLOCK', count: s.block.attempts },
    { action: 'DIG', count: s.dig.attempts },
  ];
}

/** Career stats for one player (events from your matches only). */
export function PlayerProfilePage() {
  const teamId = Number(useParams().teamId);
  const playerId = Number(useParams().playerId);
  const { data, error } = useLoad(() => api.get<PlayerStatistics>(`/players/${playerId}/statistics`), [playerId]);

  const touches = data ? totalTouches(data.stats) : 0;
  const gridData = data
    ? {
        teams: [],
        players: [
          {
            playerId: data.playerId,
            teamId: data.teamId,
            name: data.name,
            jerseyNumber: data.jerseyNumber,
            stats: data.stats,
          },
        ],
      }
    : undefined;

  return (
    <Stack spacing={3}>
      <Button
        component={Link}
        to={`/teams/${teamId}`}
        startIcon={<ArrowBackIcon />}
        color="inherit"
        sx={{ alignSelf: 'flex-start' }}
      >
        Back to team
      </Button>
      <ErrorAlert error={error} />

      {data && (
        <>
          <Paper
            sx={{
              ...glass,
              p: { xs: 2.5, sm: 3.5 },
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                top: -80,
                right: -40,
                width: 220,
                height: 220,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha('#f472b6', 0.35)}, transparent 70%)`,
                filter: 'blur(24px)',
              }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <Box
                sx={{
                  width: 88,
                  height: 88,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 28,
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #6366f1, #0891b2)',
                  boxShadow: `0 8px 32px ${alpha('#6366f1', 0.45)}`,
                }}
              >
                {data.jerseyNumber}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h4" sx={gradientBrandText}>
                  {data.name}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  <Chip icon={<SportsVolleyballIcon />} label={formatRole(data.role)} size="small" />
                  <Chip label={data.teamName} size="small" variant="outlined" component={Link} to={`/teams/${data.teamId}`} clickable />
                  {!data.isActive && <Chip label="Inactive" size="small" color="warning" />}
                </Stack>
              </Box>
            </Stack>

            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={4}>
                <StatHighlightGrid
                  items={[
                    { label: 'Matches played', value: data.matches, accent: '#818cf8' },
                    { label: 'Total touches', value: touches, accent: '#22d3ee' },
                    { label: 'Attack kills', value: data.stats.attack.kills, accent: '#f472b6' },
                    { label: 'Aces', value: data.stats.serve.aces, accent: '#34d399' },
                  ]}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <Stack direction="row" justifyContent="space-around" sx={{ py: 1 }}>
                  <EfficiencyRing value={attackEfficiency(data.stats)} label="Attack efficiency" color="#f472b6" />
                  <EfficiencyRing value={receptionPositiveRate(data.stats)} label="Reception +" color="#22d3ee" />
                  <EfficiencyRing
                    value={
                      data.stats.serve.attempts
                        ? Math.round((data.stats.serve.aces / data.stats.serve.attempts) * 100)
                        : 0
                    }
                    label="Ace rate"
                    color="#34d399"
                  />
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={2.5}>
            <Grid item xs={12} md={5}>
              <Paper sx={{ ...glass, p: 2.5, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Action breakdown
                </Typography>
                <ActionMixChart data={playerActionRows(data.stats)} />
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper sx={{ ...glass, p: 2.5, overflowX: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Full stat line
                </Typography>
                <StatsGrid data={gridData} />
              </Paper>
            </Grid>
          </Grid>

          {touches === 0 && (
            <Typography color="text.secondary">
              No events recorded for this player in your matches yet. Stats appear after you log touches in live matches.
            </Typography>
          )}
        </>
      )}
    </Stack>
  );
}
