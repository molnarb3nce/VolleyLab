import BoltIcon from '@mui/icons-material/Bolt';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import GroupsIcon from '@mui/icons-material/Groups';
import SportsIcon from '@mui/icons-material/Sports';
import SportsVolleyballIcon from '@mui/icons-material/SportsVolleyball';
import { alpha, Box, Card, CardActionArea, CardContent, Grid, Paper, Stack, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import {
  ActionMixChart,
  MatchActivityChart,
  TopAttackersChart,
} from '../components/StatCharts';
import { glass, gradientBrandText } from '../glass';
import { ErrorAlert, useLoad } from '../hooks';
import { attackEfficiency, useAnimatedNumber } from '../stats-display';
import { Match, StatisticsOverview, Tactic, Team } from '../types';

const CARD_ACCENTS = ['#818cf8', '#22d3ee', '#34d399'] as const;

export function Dashboard() {
  const navigate = useNavigate();
  const { data, error } = useLoad(async () => {
    const [teams, matches, tactics, overview] = await Promise.all([
      api.get<Team[]>('/teams?mine=true'),
      api.get<Match[]>('/matches'),
      api.get<Tactic[]>('/tactics'),
      api.get<StatisticsOverview>('/statistics/overview'),
    ]);
    return {
      counts: { teams: teams.length, matches: matches.length, tactics: tactics.length },
      overview,
    };
  }, []);

  const events = useAnimatedNumber(data?.overview.totalEvents ?? 0);
  const kills = useAnimatedNumber(data?.overview.stats.attack.kills ?? 0);
  const eff = data?.overview ? attackEfficiency(data.overview.stats) : 0;
  const effAnim = useAnimatedNumber(eff);

  const cards = [
    { title: 'My teams', count: data?.counts.teams, to: '/teams', icon: GroupsIcon },
    { title: 'My matches', count: data?.counts.matches, to: '/matches', icon: SportsVolleyballIcon },
    { title: 'My tactics', count: data?.counts.tactics, to: '/tactics', icon: SportsIcon },
  ];

  return (
    <>
      <Paper
        sx={{
          ...glass,
          p: { xs: 2.5, sm: 4 },
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
          '@keyframes pulseGlow': {
            '0%, 100%': { opacity: 0.45, transform: 'scale(1)' },
            '50%': { opacity: 0.75, transform: 'scale(1.05)' },
          },
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: -40,
            background:
              'radial-gradient(ellipse 60% 50% at 20% 20%, rgba(99,102,241,0.35), transparent), radial-gradient(ellipse 50% 40% at 80% 60%, rgba(34,211,238,0.25), transparent)',
            animation: 'pulseGlow 8s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
        <Stack spacing={1} sx={{ position: 'relative' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <BoltIcon sx={{ color: '#67e8f9' }} />
            <Typography variant="overline" sx={{ letterSpacing: 2, color: alpha('#fff', 0.65) }}>
              Live insights
            </Typography>
          </Stack>
          <Typography variant="h3" sx={{ ...gradientBrandText, fontWeight: 800, fontSize: { xs: '1.75rem', sm: '2.25rem' } }}>
            Welcome back, coach
          </Typography>
          <Typography color="text.secondary" maxWidth={520}>
            Your match data powers these charts — every reception, kill, and ace from the matches you record.
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={3} sx={{ mt: 2 }} useFlexGap>
            <HeroMetric label="Events logged" value={events} suffix="" accent="#818cf8" />
            <HeroMetric label="Attack kills" value={kills} suffix="" accent="#f472b6" />
            <HeroMetric label="Attack efficiency" value={effAnim} suffix="%" accent="#34d399" />
            <HeroMetric label="Matches with data" value={data?.overview.matchesWithEvents ?? 0} suffix="" accent="#22d3ee" />
          </Stack>
        </Stack>
      </Paper>

      <ErrorAlert error={error} />

      <Card
        sx={{
          mb: 3,
          overflow: 'hidden',
          border: `1px solid ${alpha('#22d3ee', 0.35)}`,
          background: `linear-gradient(135deg, ${alpha('#6366f1', 0.22)} 0%, ${alpha('#0891b2', 0.12)} 100%)`,
        }}
      >
        <CardActionArea component={Link} to="/quick-match">
          <CardContent sx={{ py: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <FlashOnIcon sx={{ fontSize: 40, color: '#67e8f9' }} />
              <Box flex={1}>
                <Typography variant="h6" fontWeight={700}>
                  Quick match
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Score a pickup game in seconds — random team names, no database, survives refresh on this device.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {cards.map((c, i) => (
          <Grid item xs={12} sm={4} key={c.title}>
            <Card sx={{ position: 'relative', overflow: 'hidden', '&:hover': { transform: 'translateY(-3px)' }, transition: 'transform 0.25s' }}>
              <BoxGlow color={CARD_ACCENTS[i % CARD_ACCENTS.length]} />
              <CardActionArea component={Link} to={c.to} sx={{ position: 'relative' }}>
                <CardContent sx={{ py: 2.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <c.icon sx={{ color: CARD_ACCENTS[i], opacity: 0.9 }} />
                    <Typography color="text.secondary" variant="body2" fontWeight={600}>
                      {c.title}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="h3"
                    sx={{
                      mt: 0.5,
                      fontWeight: 700,
                      background: `linear-gradient(135deg, ${CARD_ACCENTS[i]}, ${alpha('#fff', 0.85)})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {c.count ?? '—'}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...glass, p: 2.5, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Action mix
            </Typography>
            <ActionMixChart data={data?.overview.byAction ?? []} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...glass, p: 2.5, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Top attackers
            </Typography>
            <TopAttackersChart
              data={data?.overview.topAttackers ?? []}
              onPlayerClick={(id) => {
                const row = data?.overview.topAttackers.find((p: { playerId: number; teamId: number }) => p.playerId === id);
                if (row) navigate(`/teams/${row.teamId}/players/${id}`);
              }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...glass, p: 2.5, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent match activity
            </Typography>
            <MatchActivityChart data={data?.overview.recentMatches ?? []} />
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}

function HeroMetric({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number;
  suffix: string;
  accent: string;
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={800} sx={{ color: accent, fontVariantNumeric: 'tabular-nums' }}>
        {value}
        {suffix}
      </Typography>
    </Box>
  );
}

function BoxGlow({ color }: { color: string }) {
  return (
    <Typography
      component="span"
      aria-hidden
      sx={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(color, 0.45)}, transparent 70%)`,
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }}
    />
  );
}
