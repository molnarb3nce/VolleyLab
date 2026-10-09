import { alpha, Box, Stack, Typography } from '@mui/material';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { glassSubtle } from '../glass';
import { ACTION_COLORS, ACTION_LABEL } from '../stats-display';
import { EventAction } from '../types';

const chartTooltipStyle = {
  background: 'rgba(15, 23, 42, 0.92)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  color: '#e2e8f0',
};

export function ActionMixChart({ data }: { data: { action: EventAction; count: number }[] }) {
  const filtered = data.filter((d) => d.count > 0);
  if (filtered.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2" sx={{ py: 6, textAlign: 'center' }}>
        Record match events to see your action mix.
      </Typography>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="count"
          nameKey="action"
          cx="50%"
          cy="50%"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={3}
          animationDuration={800}
          label={(props) => {
            const action = (props as { action?: EventAction }).action;
            const pct = props.percent ?? 0;
            return action ? `${ACTION_LABEL[action]} ${(pct * 100).toFixed(0)}%` : '';
          }}
        >
          {filtered.map((entry) => (
            <Cell key={entry.action} fill={ACTION_COLORS[entry.action]} stroke="rgba(255,255,255,0.08)" />
          ))}
        </Pie>
        <Tooltip contentStyle={chartTooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TopAttackersChart({
  data,
  onPlayerClick,
}: {
  data: { playerId: number; teamId: number; name: string; jerseyNumber: number; kills: number; attempts: number }[];
  onPlayerClick?: (playerId: number) => void;
}) {
  if (data.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2" sx={{ py: 6, textAlign: 'center' }}>
        No attack data yet.
      </Typography>
    );
  }
  const rows = data.map((p) => ({
    ...p,
    label: `#${p.jerseyNumber} ${p.name.split(' ')[0]}`,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="label" width={88} stroke="#64748b" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Bar
          dataKey="kills"
          fill="#f472b6"
          radius={[0, 6, 6, 0]}
          animationDuration={900}
          onClick={(bar) => {
            const row = bar?.payload as { playerId?: number } | undefined;
            if (row?.playerId) onPlayerClick?.(row.playerId);
          }}
          style={{ cursor: onPlayerClick ? 'pointer' : undefined }}
        />
        <Bar dataKey="attempts" fill={alpha('#818cf8', 0.45)} radius={[0, 6, 6, 0]} animationDuration={1100} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MatchActivityChart({ data }: { data: { label: string; eventCount: number }[] }) {
  if (data.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2" sx={{ py: 4, textAlign: 'center' }}>
        No recent match activity.
      </Typography>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ bottom: 48 }}>
        <XAxis
          dataKey="label"
          stroke="#64748b"
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          interval={0}
          angle={-22}
          textAnchor="end"
          height={56}
        />
        <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Bar dataKey="eventCount" fill="url(#activityGradient)" radius={[8, 8, 0, 0]} animationDuration={850} />
        <defs>
          <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EfficiencyRing({ value, label, color }: { value: number; label: string; color: string }) {
  const chartData = [{ name: label, value, fill: color }];
  return (
    <Box sx={{ textAlign: 'center', flex: 1, minWidth: 100 }}>
      <ResponsiveContainer width="100%" height={120}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="68%"
          outerRadius="100%"
          barSize={10}
          data={chartData}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar background={{ fill: alpha(color, 0.12) }} dataKey="value" cornerRadius={8} animationDuration={1000} />
        </RadialBarChart>
      </ResponsiveContainer>
      <Typography variant="h5" fontWeight={700} sx={{ mt: -6.5, color: '#f8fafc' }}>
        {value}%
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

export function StatHighlightGrid({
  items,
}: {
  items: { label: string; value: string | number; accent: string }[];
}) {
  return (
    <Stack direction="row" flexWrap="wrap" gap={1.5} useFlexGap>
      {items.map((item) => (
        <Box
          key={item.label}
          sx={{
            ...glassSubtle,
            borderRadius: 2,
            px: 2,
            py: 1.25,
            minWidth: 120,
            flex: '1 1 120px',
            borderLeft: `3px solid ${item.accent}`,
          }}
        >
          <Typography variant="caption" color="text.secondary" display="block">
            {item.label}
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            {item.value}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
