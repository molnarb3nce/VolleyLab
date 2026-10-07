import { Card, CardActionArea, CardContent, Grid, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { ErrorAlert, useLoad } from '../hooks';
import { Match, Tactic, Team } from '../types';

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
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      <ErrorAlert error={error} />
      <Grid container spacing={2}>
        {cards.map((c) => (
          <Grid item xs={12} sm={4} key={c.title}>
            <Card>
              <CardActionArea component={Link} to={c.to}>
                <CardContent>
                  <Typography color="text.secondary">{c.title}</Typography>
                  <Typography variant="h3">{c.count ?? '-'}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
