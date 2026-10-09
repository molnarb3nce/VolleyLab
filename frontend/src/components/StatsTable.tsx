import {
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { glassSubtle } from '../glass';
import { ErrorAlert, useLoad } from '../hooks';
import { MatchStatistics, Stats } from '../types';

export const STAT_COLUMNS: { head: string; value: (s: Stats) => string }[] = [
  { head: 'Serve (ace/err/att)', value: (s) => `${s.serve.aces}/${s.serve.errors}/${s.serve.attempts}` },
  {
    head: 'Reception (perf/good/poor/err/att)',
    value: (s) => `${s.reception.perfect}/${s.reception.good}/${s.reception.poor}/${s.reception.errors}/${s.reception.attempts}`,
  },
  { head: 'Set (good/poor/err/att)', value: (s) => `${s.set.good}/${s.set.poor}/${s.set.errors}/${s.set.attempts}` },
  { head: 'Attack (kill/blk/err/att)', value: (s) => `${s.attack.kills}/${s.attack.blocked}/${s.attack.errors}/${s.attack.attempts}` },
  { head: 'Block (pt/touch/err)', value: (s) => `${s.block.points}/${s.block.touches}/${s.block.errors}` },
  { head: 'Dig (good/poor/err/att)', value: (s) => `${s.dig.good}/${s.dig.poor}/${s.dig.errors}/${s.dig.attempts}` },
];

function hasAnyStat(s: Stats): boolean {
  return (
    s.serve.attempts +
      s.reception.attempts +
      s.set.attempts +
      s.attack.attempts +
      s.block.attempts +
      s.dig.attempts >
    0
  );
}

function StatCard({
  title,
  stats,
  linkPlayers,
  teamId,
  playerId,
  jerseyNumber,
}: {
  title: ReactNode;
  stats: Stats;
  linkPlayers?: boolean;
  teamId?: number;
  playerId?: number;
  jerseyNumber?: number;
}) {
  return (
    <Paper sx={{ ...glassSubtle, p: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {linkPlayers && teamId != null && playerId != null ? (
          <Link to={`/teams/${teamId}/players/${playerId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            #{jerseyNumber} {title}
          </Link>
        ) : (
          title
        )}
      </Typography>
      <Stack spacing={0.75} divider={<Divider flexItem />}>
        {STAT_COLUMNS.map((c) => (
          <Stack key={c.head} direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1, pr: 1 }}>
              {c.head}
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {c.value(stats)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

function StatsMobileCards({
  data,
  linkPlayers,
}: {
  data: MatchStatistics;
  linkPlayers?: boolean;
}) {
  const activePlayers = data.players.filter((p) => hasAnyStat(p.stats));

  return (
    <Stack spacing={2}>
      {data.teams.map((t) => (
        <StatCard key={`team-${t.side}`} title={`${t.name} (total)`} stats={t.stats} />
      ))}
      {activePlayers.map((p) => (
        <StatCard
          key={p.playerId}
          title={p.name}
          stats={p.stats}
          linkPlayers={linkPlayers}
          teamId={p.teamId}
          playerId={p.playerId}
          jerseyNumber={p.jerseyNumber}
        />
      ))}
    </Stack>
  );
}

export function StatsGrid({
  data,
  linkPlayers,
}: {
  data?: MatchStatistics;
  /** When set, player names link to `/teams/:teamId/players/:id`. */
  linkPlayers?: boolean;
}) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));

  if (!data) return null;
  if (compact) return <StatsMobileCards data={data} linkPlayers={linkPlayers} />;

  return (
    <Table size="small" sx={{ minWidth: 960 }}>
      <TableHead>
        <TableRow>
          <TableCell>Player / team</TableCell>
          {STAT_COLUMNS.map((c) => (
            <TableCell key={c.head}>{c.head}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {data.teams.map((t) => (
          <TableRow key={`team-${t.side}`} sx={{ bgcolor: 'action.hover' }}>
            <TableCell>
              <b>{t.name} (total)</b>
            </TableCell>
            {STAT_COLUMNS.map((c) => (
              <TableCell key={c.head}>
                <b>{c.value(t.stats)}</b>
              </TableCell>
            ))}
          </TableRow>
        ))}
        {data.players
          .filter((p) => hasAnyStat(p.stats))
          .map((p) => (
            <TableRow key={p.playerId}>
              <TableCell>
                {linkPlayers ? (
                  <Link to={`/teams/${p.teamId}/players/${p.playerId}`} style={{ color: 'inherit', fontWeight: 600 }}>
                    #{p.jerseyNumber} {p.name}
                  </Link>
                ) : (
                  <>
                    #{p.jerseyNumber} {p.name}
                  </>
                )}
              </TableCell>
              {STAT_COLUMNS.map((c) => (
                <TableCell key={c.head}>{c.value(p.stats)}</TableCell>
              ))}
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}

/** Statistics derived by the backend from the recorded events. */
export function StatsTable({ matchId, version }: { matchId: number; version: number }) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const { data, error } = useLoad(() => api.get<MatchStatistics>(`/matches/${matchId}/statistics`), [matchId, version]);

  return (
    <Paper sx={{ p: 2, overflowX: compact ? 'visible' : 'auto', WebkitOverflowScrolling: 'touch' }}>
      <Typography variant="h6" gutterBottom>
        Statistics
      </Typography>
      <ErrorAlert error={error} />
      <StatsGrid data={data} linkPlayers />
      {data && !data.teams.some((t) => hasAnyStat(t.stats)) && data.players.every((p) => !hasAnyStat(p.stats)) && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          No events recorded yet.
        </Typography>
      )}
    </Paper>
  );
}
