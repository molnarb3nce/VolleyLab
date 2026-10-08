import { alpha, Card, CardActionArea, CardContent, Grid, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { gradientBrandText } from '../glass';
import { ErrorAlert, useLoad } from '../hooks';
import { Match, Tactic, Team } from '../types';

const CARD_ACCENTS = ['#818cf8', '#22d3ee', '#34d399'] as const;

export function Dashboard() {
  const { data, error } = useLoad(async () => {
    const [teams, matches, tactics] = await Promise.all([
      api.get<Team[]>('/teams?mine=true'),
      api.get<Match[]>('/matches'),
      api.get<Tactic[]>('/tactics'),
    ]);
    return { teams: teams.length, matches: matches.length, tactics: tactics.length };
  }, []);

  const cards = [
    { title: 'My teams', count: data?.teams, to: '/teams' },
    { title: 'My matches', count: data?.matches, to: '/matches' },
    { title: 'My tactics', count: data?.tactics, to: '/tactics' },
  ];

  return (
    <>
      <Typography variant="h4" gutterBottom sx={gradientBrandText}>
        Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Your volleyball workspace at a glance.
      </Typography>
      <ErrorAlert error={error} />
      <Grid container spacing={2.5}>
        {cards.map((c, i) => (
          <Grid item xs={12} sm={4} key={c.title}>
            <Card
              sx={{
                position: 'relative',
                overflow: 'hidden',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <BoxGlow color={CARD_ACCENTS[i % CARD_ACCENTS.length]} />
              <CardActionArea component={Link} to={c.to} sx={{ position: 'relative' }}>
                <CardContent sx={{ py: 2.5 }}>
                  <Typography color="text.secondary" variant="body2" fontWeight={600}>
                    {c.title}
                  </Typography>
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
    </>
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
